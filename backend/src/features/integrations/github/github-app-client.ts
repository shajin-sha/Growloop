import { readFile } from "node:fs/promises";

import { App } from "@octokit/app";

import { env } from "../../../config/env";
import { logger } from "../../../logger";
import type { GitHubInstallationRepository } from "./repositories/github-installation.repository";

export type PullRequestInput = {
  repoFullName: string;
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
};

export type PullRequestResult = {
  url: string;
  number: number;
};

export type PullRequestStatusResult = {
  number: number;
  url: string;
  state: "open" | "closed" | "merged";
  mergeable: boolean | null;
  title: string;
};

export type GitHubInstallationDetails = {
  installationId: number;
  accountLogin: string;
  targetType: string;
};

export interface PullRequestClient {
  createPullRequest(input: PullRequestInput): Promise<PullRequestResult>;
  getPullRequestStatus(
    repoFullName: string,
    pullRequestNumber: number
  ): Promise<PullRequestStatusResult>;
  closePullRequest(repoFullName: string, pullRequestNumber: number): Promise<void>;
  mergePullRequest(repoFullName: string, pullRequestNumber: number): Promise<void>;
  deleteBranch(repoFullName: string, branchName: string): Promise<void>;
  listInstallationRepos(): Promise<string[]>;
}

export interface GitHubInstallationTokenProvider {
  createInstallationToken(): Promise<string>;
}

export class GitHubAppClient implements PullRequestClient {
  constructor(private readonly installations: GitHubInstallationRepository) { }

  async createPullRequest(input: PullRequestInput): Promise<PullRequestResult> {
    const octokit = await this.createInstallationClient();
    const [owner, repo] = input.repoFullName.split("/");

    if (!owner || !repo) {
      throw new Error("repoFullName must use owner/repo format");
    }

    const result = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
      owner,
      repo,
      title: input.title,
      body: input.body,
      head: input.headBranch,
      base: input.baseBranch
    });

    logger.info("Created GitHub pull request", {
      module: "github",
      repoFullName: input.repoFullName,
      pullRequestNumber: result.data.number
    });

    return {
      url: result.data.html_url,
      number: result.data.number
    };
  }

  async mergePullRequest(repoFullName: string, pullRequestNumber: number): Promise<void> {
    const octokit = await this.createInstallationClient();
    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      throw new Error("repoFullName must use owner/repo format");
    }

    await octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
      owner,
      repo,
      pull_number: pullRequestNumber,
      merge_method: "squash"
    });
  }

  async getPullRequestStatus(
    repoFullName: string,
    pullRequestNumber: number
  ): Promise<PullRequestStatusResult> {
    const octokit = await this.createInstallationClient();
    const [owner, repo] = this.splitRepo(repoFullName);
    const result = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner,
      repo,
      pull_number: pullRequestNumber
    });

    return {
      number: result.data.number,
      url: result.data.html_url,
      state: result.data.merged ? "merged" : result.data.state,
      mergeable: result.data.mergeable,
      title: result.data.title
    };
  }

  async closePullRequest(repoFullName: string, pullRequestNumber: number): Promise<void> {
    const octokit = await this.createInstallationClient();
    const [owner, repo] = this.splitRepo(repoFullName);

    await octokit.request("PATCH /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner,
      repo,
      pull_number: pullRequestNumber,
      state: "closed"
    });
  }

  async deleteBranch(repoFullName: string, branchName: string): Promise<void> {
    const octokit = await this.createInstallationClient();
    const [owner, repo] = this.splitRepo(repoFullName);

    await octokit.request("DELETE /repos/{owner}/{repo}/git/refs/{ref}", {
      owner,
      repo,
      ref: `heads/${branchName}`
    });
  }

  async listInstallationRepos(): Promise<string[]> {
    const octokit = await this.createInstallationClient();
    const result = await octokit.request("GET /installation/repositories", {
      per_page: 100
    });

    return result.data.repositories.map((repo: { full_name: string }) => repo.full_name);
  }

  async getInstallationDetails(installationId: number): Promise<GitHubInstallationDetails> {
    const details = await this.findInstallationDetails(installationId);

    if (!details) {
      throw new Error("GitHub App installation was not found");
    }

    return details;
  }

  async createInstallationToken(): Promise<string> {
    const installation = await this.installations.findLatest();

    if (!installation) {
      throw new Error("GitHub App is not installed");
    }

    const app = await this.createApp();
    const auth = await app.octokit.auth({
      type: "installation",
      installationId: installation.installationId
    });

    if (!isInstallationTokenAuth(auth)) {
      throw new Error("GitHub installation token response was invalid");
    }

    return auth.token;
  }

  async findInstallationDetails(installationId: number): Promise<GitHubInstallationDetails | null> {
    const app = await this.createApp();

    try {
      const result = await app.octokit.request("GET /app/installations/{installation_id}", {
        installation_id: installationId
      });

      return {
        installationId: result.data.id,
        accountLogin: getAccountLogin(result.data.account),
        targetType: result.data.target_type
      };
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        return null;
      }

      throw error;
    }
  }

  private async createInstallationClient() {
    if (!env.GITHUB_APP_ID) {
      throw new Error("GitHub App environment variables are not configured");
    }

    const installation = await this.installations.findLatest();

    if (!installation) {
      throw new Error("GitHub App is not installed");
    }

    const app = await this.createApp();
    return app.getInstallationOctokit(installation.installationId);
  }

  private async createApp() {
    if (!env.GITHUB_APP_ID) {
      throw new Error("GitHub App ID is not configured");
    }

    return new App({
      appId: env.GITHUB_APP_ID,
      privateKey: await this.getPrivateKey()
    });
  }

  private async getPrivateKey() {
    if (env.GITHUB_APP_PRIVATE_KEY_PATH) {
      return readFile(env.GITHUB_APP_PRIVATE_KEY_PATH, "utf8");
    }

    if (env.GITHUB_APP_PRIVATE_KEY) {
      return env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
    }

    throw new Error("GitHub App private key is not configured");
  }

  private splitRepo(repoFullName: string) {
    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      throw new Error("repoFullName must use owner/repo format");
    }

    return [owner, repo] as const;
  }
}

function isInstallationTokenAuth(auth: unknown): auth is { token: string } {
  if (typeof auth !== "object" || auth === null || !("token" in auth)) {
    return false;
  }

  const token = (auth as { token?: unknown }).token;
  return typeof token === "string" && token.length > 0;
}

function getAccountLogin(account: { login?: string; slug?: string } | null | undefined) {
  return account?.login ?? account?.slug ?? "unknown";
}

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}
