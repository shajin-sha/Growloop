import "dotenv/config";

import { randomUUID } from "node:crypto";

import { pool } from "../src/db/pool";
import { E2BCodexVariantGenerator } from "../src/features/integrations/e2b-codex/e2b-codex-generator";
import { GitHubAppClient } from "../src/features/integrations/github/github-app-client";
import { PostgresGitHubInstallationRepository } from "../src/features/integrations/github/repositories/postgres-github-installation.repository";

async function main() {
  const repoFullName = process.env.SMOKE_REPO_FULL_NAME ?? "shajin-sha/Growloop";
  const installations = new PostgresGitHubInstallationRepository(pool);
  const github = new GitHubAppClient(installations);
  const generator = new E2BCodexVariantGenerator(github);

  const [plan] = await generator.generate({
    experimentId: randomUUID(),
    repoFullName,
    goal: "Verify E2B sandbox can clone, edit, push, and feed PR creation",
    allowList: [".growloop-smoke/**"],
    variantNames: ["E2B Sandbox Smoke"]
  });

  const pullRequest = await github.createPullRequest({
    repoFullName,
    title: plan.pullRequestTitle,
    body: plan.pullRequestBody,
    headBranch: plan.branchName,
    baseBranch: "main"
  });

  process.stdout.write(`${JSON.stringify({ plan, pullRequest }, null, 2)}\n`);
}

main()
  .finally(async () => {
    await pool.end();
  })
  .catch((error: unknown) => {
    process.stderr.write(error instanceof Error ? `${error.stack ?? error.message}\n` : `${error}\n`);
    process.exitCode = 1;
  });
