import { App } from "@octokit/app";

import { env } from "../../../config/env";
import { logger } from "../../../logger";

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

export interface PullRequestClient {
  createPullRequest(input: PullRequestInput): Promise<PullRequestResult>;
  mergePullRequest(repoFullName: string, pullRequestNumber: number): Promise<void>;
}

export class GitHubAppClient implements PullRequestClient {
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

  private async createInstallationClient() {
    if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY || !env.GITHUB_APP_INSTALLATION_ID) {
      throw new Error("GitHub App environment variables are not configured");
    }

    const app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n")
    });

    return app.getInstallationOctokit(Number(env.GITHUB_APP_INSTALLATION_ID));
  }
}
