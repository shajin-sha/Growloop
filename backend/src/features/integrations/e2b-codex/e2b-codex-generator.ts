import { randomUUID } from "node:crypto";

import { Sandbox } from "e2b/dist/index.mjs";

import { env } from "../../../config/env";
import { logger } from "../../../logger";
import type { GitHubInstallationTokenProvider } from "../github/github-app-client";

export type GeneratedVariant = {
  name: string;
  branchName: string;
  pullRequestTitle: string;
  pullRequestBody: string;
};

export type GeneratedExperimentPlan = {
  name: string;
  description: string;
};

export type GenerateVariantsInput = {
  experimentId: string;
  goalId?: string;
  conversionEvent?: string;
  repoFullName: string;
  goal: string;
  allowList: string[];
  variantNames?: string[];
};

export type PlanGoalExperimentsInput = {
  goal: string;
  count: number;
  repoFullName: string;
};

export type GenerateGoalInput = {
  goalId: string;
  repoFullName: string;
  goal: string;
  allowList: string[];
  experiments: Array<{
    experimentId: string;
    name: string;
    description: string | null;
    conversionEvent: string;
  }>;
};

export type GenerateGoalResult = {
  branchName: string;
  pullRequestTitle: string;
  pullRequestBody: string;
};

export interface VariantGenerator {
  planGoalExperiments(input: PlanGoalExperimentsInput): Promise<GeneratedExperimentPlan[]>;
  generate(input: GenerateVariantsInput): Promise<GeneratedVariant[]>;
  generateForGoal(input: GenerateGoalInput): Promise<GenerateGoalResult>;
}

const REPO_PATH = "/home/user/repo";
const GITHUB_USERNAME = "x-access-token";
const CODEX_PLANNING_SYSTEM_PROMPT = [
  "You are a Growloop experiment planner.",
  "You have access to a cloned repository. Your job is to explore the codebase, understand its structure,",
  "and propose focused A/B experiment ideas for the given goal.",
  "",
  "## Instructions",
  "1. Explore the repository — look at the file tree, package.json, key components, pages, routes, and any existing analytics or tracking.",
  "2. Understand what the app does and how the goal relates to the codebase.",
  "3. Propose experiment ideas that target REAL files and components you found in the repo.",
  "4. Each experiment should target a different lever (copy, layout, trust, urgency, UX friction, etc.).",
  "5. Keep names short (2-5 words). Descriptions should be one specific sentence referencing actual files or components.",
  "",
  "## Output",
  "Write ONLY a JSON array to /tmp/plans.json with this format:",
  '[{"name": "Short name", "description": "One sentence describing the specific change and which file/component it targets."}]',
  "",
  "Do NOT write anything else. Do NOT modify any source files. Only write /tmp/plans.json."
].join("\n");


const CODEX_EXPERIMENT_SYSTEM_PROMPT = [
  "You are the Codex agent running a Growloop conversion experiment.",
  "Your only job is to create one small, production-safe code patch that helps the supplied goal.",
  "",
  "## Step 1 — Search for existing Growloop SDK usage",
  "Before writing any code, search the repository for existing Growloop SDK usage:",
  "  grep -r 'growloop' . --include='*.js' --include='*.ts' --include='*.tsx' --include='*.jsx' --include='*.html' -l 2>/dev/null",
  "  grep -r '@growloop/sdk\\|createGrowloop\\|window.Growloop\\|data-goal-id\\|data-experiment-id' . --include='*.js' --include='*.ts' --include='*.tsx' --include='*.jsx' --include='*.html' -l 2>/dev/null",
  "  cat package.json 2>/dev/null | grep growloop",
  "  find . -name 'package.json' -not -path '*/node_modules/*' -exec grep -l growloop {} \\;",
  "",
  "## Step 2 — Decide SDK integration approach",
  "If the SDK is already installed and initialized:",
  "  - Reuse the existing GrowloopClient instance. Do NOT create a second one.",
  "  - Call client.track('<conversion_event>') at the conversion point for this experiment.",
  "  - If the existing init uses goalId, ensure this experiment's goalId is passed.",
  "",
  "If the SDK is NOT yet present in the repo:",
  "  - Add @growloop/sdk as a dependency in the relevant package.json.",
  "  - Initialize once at the app entry point using goalId (not experimentId) so the SDK assigns each visitor to exactly one experiment under the goal:",
  "      import { createGrowloop } from '@growloop/sdk';",
  "      const growloop = createGrowloop({ apiUrl: '<GROWLOOP_API_URL>', goalId: '<GOAL_ID>' });",
  "  - Replace <GROWLOOP_API_URL> with the value from the repo's existing API_URL env var, or leave a TODO comment.",
  "  - Replace <GOAL_ID> with the goalId provided in the experiment context.",
  "  - Export or attach the client so conversion tracking can call growloop.track('<conversion_event>').",
  "",
  "## Step 3 — Make the experiment change",
  "  - Make the smallest useful UI, copy, funnel, or activation change that plausibly improves the goal.",
  "  - Gate the change on the assigned variantId from the SDK: only show the patch to visitors assigned to this variant.",
  "  - Use the SDK assignment: const assignment = growloop.getAssignment(); if (assignment?.variantId === '<VARIANT_ID>') { /* show patch */ }",
  "  - Keep the change reversible and isolated to the allowed paths.",
  "  - Do not render or expose all experiments to the same visitor.",
  "",
  "## Rules",
  "  - Do not create external accounts, credentials, migrations, or background jobs unless the repo already has a clear local pattern.",
  "  - Do not commit, push, open pull requests, or talk to anyone. Growloop handles GitHub after you finish.",
  "  - Use the goal as the source of truth. Do not invent unrelated product strategy."
].join("\n");

export class E2BCodexVariantGenerator implements VariantGenerator {
  constructor(private readonly github: GitHubInstallationTokenProvider) { }

  async planGoalExperiments(input: PlanGoalExperimentsInput): Promise<GeneratedExperimentPlan[]> {
    if (!getCodexApiKey()) throw new Error("OPENAI_API_KEY or CODEX_API_KEY is required");
    if (!env.E2B_API_KEY) throw new Error("E2B_API_KEY is required");

    const token = await this.github.createInstallationToken();

    const sandbox = await Sandbox.create(env.E2B_TEMPLATE, {
      apiKey: env.E2B_API_KEY,
      timeoutMs: env.E2B_SANDBOX_TIMEOUT_MS,
      envs: { ...getCodexEnvironment() }
    });

    logger.info("Planning experiments via Codex", {
      module: "e2b-codex",
      repoFullName: input.repoFullName,
      goal: input.goal,
      sandboxId: sandbox.sandboxId
    });

    try {
      await sandbox.git.clone(`https://github.com/${input.repoFullName}.git`, {
        path: REPO_PATH,
        branch: "main",
        depth: 1,
        username: GITHUB_USERNAME,
        password: token,
        timeoutMs: 120_000
      });

      const prompt = [
        CODEX_PLANNING_SYSTEM_PROMPT,
        "",
        `Goal: "${input.goal}"`,
        `Number of experiments to propose: ${input.count}`,
        "",
        "Explore the codebase now and write /tmp/plans.json."
      ].join("\n");

      try {
        await sandbox.commands.run(
          `${env.CODEX_COMMAND} exec --full-auto --skip-git-repo-check -C ${REPO_PATH} ${shellQuote(prompt)}`,
          { envs: getCodexEnvironment(), timeoutMs: 300_000 }
        );
      } catch (error) {
        logger.error("Codex planning command failed", {
          module: "e2b-codex",
          repoFullName: input.repoFullName,
          sandboxId: sandbox.sandboxId,
          error: getErrorMessage(error),
          stdout: getCommandOutput(error, "stdout"),
          stderr: getCommandOutput(error, "stderr")
        });
        throw error;
      }

      const result = await sandbox.commands.run("cat /tmp/plans.json", { timeoutMs: 10_000 });
      const raw = result.stdout.trim();

      if (!raw) throw new Error("Codex did not produce /tmp/plans.json");

      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const parsed = JSON.parse(jsonStr) as Array<{ name: string; description: string }>;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Codex produced invalid plans JSON");
      }

      return parsed.slice(0, input.count).map((item) => ({
        name: String(item.name || "Experiment"),
        description: String(item.description || "Codex-generated experiment plan.")
      }));
    } finally {
      await sandbox.kill().catch(() => { });
    }
  }

  async generateForGoal(input: GenerateGoalInput): Promise<GenerateGoalResult> {
    if (!env.E2B_API_KEY) throw new Error("E2B_API_KEY is required");
    if (!getCodexApiKey()) throw new Error("OPENAI_API_KEY or CODEX_API_KEY is required");

    const token = await this.github.createInstallationToken();
    const suffix = randomUUID().slice(0, 8);
    const branchName = `growloop/goal-${input.goalId.slice(0, 8)}/${suffix}`;

    const sandbox = await Sandbox.create(env.E2B_TEMPLATE, {
      apiKey: env.E2B_API_KEY,
      timeoutMs: env.E2B_SANDBOX_TIMEOUT_MS,
      envs: { ...getCodexEnvironment() }
    });

    logger.info("Created E2B sandbox for goal", {
      module: "e2b-codex",
      goalId: input.goalId,
      repoFullName: input.repoFullName,
      branchName,
      sandboxId: sandbox.sandboxId
    });

    try {
      await sandbox.git.clone(`https://github.com/${input.repoFullName}.git`, {
        path: REPO_PATH,
        branch: "main",
        depth: 1,
        username: GITHUB_USERNAME,
        password: token,
        timeoutMs: 120_000
      });

      await sandbox.git.createBranch(REPO_PATH, branchName);

      // Run Codex for each experiment sequentially on the same branch
      for (const experiment of input.experiments) {
        const prompt = [
          "SYSTEM PROMPT FOR CODEX AGENT",
          CODEX_EXPERIMENT_SYSTEM_PROMPT,
          "",
          "EXPERIMENT CONTEXT",
          `Goal: ${input.goal}`,
          `Goal ID: ${input.goalId}`,
          `Experiment ID: ${experiment.experimentId}`,
          `Experiment name: ${experiment.name}`,
          `Experiment description: ${experiment.description ?? "none"}`,
          `Conversion event: ${experiment.conversionEvent}`,
          `Allowed paths: ${input.allowList.join(", ") || "none provided"}`,
          "",
          "TASK",
          "Implement this single experiment now. Make the smallest useful code change that can plausibly improve the goal.",
          "IMPORTANT: Do NOT undo or overwrite changes from previous experiments. Build on top of what already exists in the working directory."
        ].join("\n");

        try {
          await sandbox.commands.run(
            `${env.CODEX_COMMAND} exec --full-auto --skip-git-repo-check -C ${REPO_PATH} ${shellQuote(prompt)}`,
            { envs: getCodexEnvironment(), timeoutMs: 300_000 }
          );

          // Commit after each experiment so changes are preserved
          await sandbox.git.add(REPO_PATH, { all: true });
          await sandbox.git.commit(REPO_PATH, `experiment: ${experiment.name}`, {
            authorName: "growloopbot[bot]",
            authorEmail: "growloopbot[bot]@users.noreply.github.com"
          });

          logger.info("Codex completed experiment", {
            module: "e2b-codex",
            goalId: input.goalId,
            experimentId: experiment.experimentId,
            experimentName: experiment.name
          });
        } catch (error) {
          logger.error("Codex failed for experiment, continuing with others", {
            module: "e2b-codex",
            goalId: input.goalId,
            experimentId: experiment.experimentId,
            experimentName: experiment.name,
            error: getErrorMessage(error),
            stdout: getCommandOutput(error, "stdout"),
            stderr: getCommandOutput(error, "stderr")
          });
          // Continue with next experiment even if one fails
        }
      }

      await sandbox.git.configureUser("growloopbot[bot]", "growloopbot[bot]@users.noreply.github.com", {
        scope: "local",
        path: REPO_PATH
      });

      await sandbox.git.push(REPO_PATH, {
        remote: "origin",
        branch: branchName,
        username: GITHUB_USERNAME,
        password: token,
        timeoutMs: 120_000
      });

      logger.info("Pushed goal branch", {
        module: "e2b-codex",
        goalId: input.goalId,
        branchName
      });

      const experimentList = input.experiments.map((e) => `- **${e.name}**: ${e.description ?? "Codex-generated"}`).join("\n");

      return {
        branchName,
        pullRequestTitle: `[Growloop] ${input.goal}`,
        pullRequestBody: [
          "Generated by Growloop.",
          "",
          `**Goal:** ${input.goal}`,
          "",
          `**Experiments (${input.experiments.length}):**`,
          experimentList,
          "",
          `Allowed paths: ${input.allowList.join(", ") || "not configured"}`,
          "",
          "Each experiment was implemented by Codex in an E2B sandbox."
        ].join("\n")
      };
    } finally {
      await sandbox.kill().catch(() => { });
    }
  }

  async generate(input: GenerateVariantsInput): Promise<GeneratedVariant[]> {
    const variants = input.variantNames?.length ? input.variantNames : ["Variant A", "Variant B"];

    if (!env.E2B_API_KEY) {
      logger.warn("E2B is not configured; returning local demo variant plans", {
        module: "e2b-codex",
        experimentId: input.experimentId
      });

      return variants.map((name) => this.createPlan(input, name));
    }

    const token = await this.github.createInstallationToken();
    const plans: GeneratedVariant[] = [];

    for (const name of variants) {
      const plan = this.createPlan(input, name);
      await this.createVariantBranch(input, plan, token);
      plans.push(plan);
    }

    return plans;
  }

  private createPlan(input: GenerateVariantsInput, name: string): GeneratedVariant {
    const suffix = randomUUID().slice(0, 8);

    return {
      name,
      branchName: `growloop/${input.experimentId}/${suffix}`,
      pullRequestTitle: `${name}: ${input.goal}`,
      pullRequestBody: [
        "Generated by Growloop.",
        "",
        `Goal: ${input.goal}`,
        `Allowed paths: ${input.allowList.join(", ") || "not configured"}`,
        getCodexApiKey()
          ? "Implementation was generated in an E2B Codex sandbox."
          : "Sandbox smoke mode: Codex API key is not configured yet."
      ].join("\n")
    };
  }

  private async createVariantBranch(
    input: GenerateVariantsInput,
    plan: GeneratedVariant,
    githubToken: string
  ): Promise<void> {
    const sandbox = await Sandbox.create(env.E2B_TEMPLATE, {
      apiKey: env.E2B_API_KEY,
      timeoutMs: env.E2B_SANDBOX_TIMEOUT_MS,
      envs: {
        ...getCodexEnvironment()
      }
    });

    logger.info("Created E2B sandbox for experiment variant", {
      module: "e2b-codex",
      experimentId: input.experimentId,
      repoFullName: input.repoFullName,
      branchName: plan.branchName,
      sandboxId: sandbox.sandboxId
    });

    try {
      await sandbox.git.clone(`https://github.com/${input.repoFullName}.git`, {
        path: REPO_PATH,
        branch: "main",
        depth: 1,
        username: GITHUB_USERNAME,
        password: githubToken,
        timeoutMs: 120_000
      });

      await sandbox.git.createBranch(REPO_PATH, plan.branchName);

      if (getCodexApiKey()) {
        await this.runCodex(sandbox, input, plan);
      } else {
        await this.writeSmokeChange(sandbox, input, plan);
      }

      await this.ensureChangesExist(sandbox, plan);
      await sandbox.git.configureUser("growloopbot[bot]", "growloopbot[bot]@users.noreply.github.com", {
        scope: "local",
        path: REPO_PATH
      });
      await sandbox.git.add(REPO_PATH, { all: true });
      await sandbox.git.commit(REPO_PATH, `experiment: ${plan.name.toLowerCase()} for ${input.goal}`, {
        authorName: "growloopbot[bot]",
        authorEmail: "growloopbot[bot]@users.noreply.github.com"
      });
      await sandbox.git.push(REPO_PATH, {
        remote: "origin",
        branch: plan.branchName,
        username: GITHUB_USERNAME,
        password: githubToken,
        timeoutMs: 120_000
      });

      logger.info("Pushed E2B-generated experiment branch", {
        module: "e2b-codex",
        experimentId: input.experimentId,
        repoFullName: input.repoFullName,
        branchName: plan.branchName,
        sandboxId: sandbox.sandboxId
      });
    } finally {
      await sandbox.kill().catch((error: unknown) => {
        logger.warn("Failed to kill E2B sandbox", {
          module: "e2b-codex",
          experimentId: input.experimentId,
          branchName: plan.branchName,
          error: getErrorMessage(error)
        });
      });
    }
  }

  private async runCodex(
    sandbox: Sandbox,
    input: GenerateVariantsInput,
    plan: GeneratedVariant
  ): Promise<void> {
    const prompt = [
      "SYSTEM PROMPT FOR CODEX AGENT",
      CODEX_EXPERIMENT_SYSTEM_PROMPT,
      "",
      "EXPERIMENT CONTEXT",
      `Goal: ${input.goal}`,
      `Goal ID: ${input.goalId ?? "not provided"}`,
      `Experiment ID: ${input.experimentId}`,
      `Conversion event: ${input.conversionEvent ?? "not provided"}`,
      `Variant name: ${plan.name}`,
      `Allowed paths: ${input.allowList.join(", ") || "none provided"}`,
      "",
      "TASK",
      "Implement this single experiment variant now. Make the smallest useful code change that can plausibly improve the goal."
    ].join("\n");

    try {
      await sandbox.commands.run(
        `${env.CODEX_COMMAND} exec --full-auto --skip-git-repo-check -C ${REPO_PATH} ${shellQuote(prompt)}`,
        {
          envs: getCodexEnvironment(),
          timeoutMs: 300_000
        }
      );
    } catch (error) {
      logger.error("Codex command failed in E2B sandbox", {
        module: "e2b-codex",
        experimentId: input.experimentId,
        branchName: plan.branchName,
        error: getErrorMessage(error),
        stdout: getCommandOutput(error, "stdout"),
        stderr: getCommandOutput(error, "stderr")
      });

      throw error;
    }
  }

  private async writeSmokeChange(
    sandbox: Sandbox,
    input: GenerateVariantsInput,
    plan: GeneratedVariant
  ): Promise<void> {
    const filePath = `.growloop-smoke/${plan.branchName.replaceAll("/", "-")}.md`;
    const content = [
      `# ${plan.name}`,
      "",
      "Created by Growloop inside an E2B sandbox.",
      "",
      `Experiment: ${input.experimentId}`,
      `Goal: ${input.goal}`,
      `Allowed paths: ${input.allowList.join(", ") || "not configured"}`
    ].join("\n");

    await sandbox.commands.run(
      `mkdir -p ${REPO_PATH}/.growloop-smoke && printf %s ${shellQuote(content)} > ${REPO_PATH}/${filePath}`,
      { timeoutMs: 30_000 }
    );
  }

  private async ensureChangesExist(sandbox: Sandbox, plan: GeneratedVariant): Promise<void> {
    const status = await sandbox.git.status(REPO_PATH);

    if (!status.hasChanges) {
      throw new Error(`No repository changes were generated for ${plan.name}`);
    }
  }
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function getCodexApiKey() {
  return env.CODEX_API_KEY ?? env.OPENAI_API_KEY ?? null;
}

function getCodexEnvironment(): Record<string, string> {
  const apiKey = getCodexApiKey();

  if (!apiKey) {
    return {};
  }

  return {
    CODEX_API_KEY: apiKey,
    OPENAI_API_KEY: apiKey
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

function getCommandOutput(error: unknown, key: "stdout" | "stderr") {
  if (typeof error !== "object" || error === null || !(key in error)) {
    return null;
  }

  const output = (error as Record<typeof key, unknown>)[key];
  return typeof output === "string" ? output.slice(0, 4_000) : null;
}
