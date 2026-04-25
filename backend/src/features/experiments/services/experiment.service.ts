import type { PullRequestClient } from "../../integrations/github/github-app-client";
import type { VariantGenerator } from "../../integrations/e2b-codex/e2b-codex-generator";
import { env } from "../../../config/env";
import { logger } from "../../../logger";
import { updateGenerationStatus } from "./generation-status";
import type { ExperimentRepository } from "../repositories/experiment.repository";
import type {
  CreateExperimentInput,
  CreateGoalInput,
  ExperimentSummary,
  ExperimentStatus,
  GoalStatus,
  GoalSummary,
  PullRequestStatus,
  SdkGoalConfig,
  SdkExperimentConfig,
  TrackEventPayload,
  WinnerResult
} from "../types/experiment.types";
import type { WinnerDetectionService } from "./winner-detection.service";

export class ExperimentService {
  constructor(
    private readonly repository: ExperimentRepository,
    private readonly winnerDetection: WinnerDetectionService,
    private readonly pullRequests: PullRequestClient,
    private readonly generator: VariantGenerator
  ) { }

  async createGoal(input: CreateGoalInput): Promise<GoalSummary> {
    const experimentCount = input.experimentCount ?? 4;

    if (experimentCount < 1 || experimentCount > 4) {
      throw new Error("A goal can have between 1 and 4 experiments");
    }

    // Get the repo from the GitHub App installation
    const repoFullName = input.repoFullName ?? await this.resolveRepo();

    const generatedPlans = await this.generator.planGoalExperiments({
      goal: input.title,
      count: experimentCount,
      repoFullName
    });
    const experimentPlans = Array.from({ length: experimentCount }, (_, index) => {
      const plan = generatedPlans[index];

      return {
        name: plan?.name ?? `Experiment ${index + 1}`,
        description: plan?.description ?? "Codex-generated experiment plan."
      };
    });

    const goal = await this.repository.createGoal({
      title: input.title,
      repoFullName,
      conversionEvent: input.conversionEvent ?? createConversionEventName(input.title),
      experimentPlans
    });

    const goalSummary = await this.getGoalOrThrow(goal.id);

    // Fire-and-forget: kick off E2B/Codex generation for each experiment
    this.generateAllExperimentPRs(goalSummary).catch((error) => {
      logger.error("Background PR generation failed for goal", {
        module: "experiment-service",
        goalId: goal.id,
        error: error instanceof Error ? error.message : "unknown error"
      });
    });

    return goalSummary;
  }

  /**
   * Get the repo where the GitHub App is installed.
   * Falls back to GROWLOOP_REPO_FULL_NAME env var if no repos found.
   */
  private async resolveRepo(): Promise<string> {
    try {
      const repos = await this.pullRequests.listInstallationRepos();
      if (repos.length > 0) {
        return repos[0];
      }
    } catch (error) {
      logger.warn("Could not list installation repos, falling back to env", {
        module: "experiment-service",
        error: error instanceof Error ? error.message : "unknown error"
      });
    }

    return env.GROWLOOP_REPO_FULL_NAME;
  }

  private async generateAllExperimentPRs(goal: GoalSummary): Promise<void> {
    for (const experiment of goal.experiments) {
      try {
        updateGenerationStatus(goal.id, experiment.id, "cloning", "Cloning repo into sandbox");
        await this.generatePullRequests(
          experiment.id,
          goal.title,
          ["src", "app", "components", "pages"]
        );
        updateGenerationStatus(goal.id, experiment.id, "done", "PR opened");
        logger.info("Generated PRs for experiment", {
          module: "experiment-service",
          goalId: goal.id,
          experimentId: experiment.id,
          experimentName: experiment.name
        });
      } catch (error) {
        updateGenerationStatus(goal.id, experiment.id, "failed", error instanceof Error ? error.message : "Unknown error");
        logger.error("Failed to generate PRs for experiment", {
          module: "experiment-service",
          goalId: goal.id,
          experimentId: experiment.id,
          experimentName: experiment.name,
          error: error instanceof Error ? error.message : "unknown error"
        });
      }
    }
  }

  async listGoals(): Promise<GoalSummary[]> {
    const goals = await this.repository.findGoals();
    return Promise.all(goals.map((goal) => this.getGoalOrThrow(goal.id)));
  }

  async getGoal(id: string): Promise<GoalSummary | null> {
    const goal = await this.repository.findGoalById(id);
    return goal ? this.getGoalOrThrow(id) : null;
  }

  async getGoalSdkConfig(id: string): Promise<SdkGoalConfig | null> {
    return this.repository.findGoalSdkConfig(id);
  }

  async updateGoalStatus(id: string, status: GoalStatus): Promise<GoalSummary | null> {
    const goal = await this.repository.updateGoalStatus(id, status);
    return goal ? this.getGoalOrThrow(id) : null;
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.repository.deleteGoal(id);
  }

  async create(input: CreateExperimentInput): Promise<ExperimentSummary> {
    const experiment = await this.repository.create(input);
    return this.withMetrics(experiment.id);
  }

  async list(): Promise<ExperimentSummary[]> {
    const experiments = await this.repository.findAll();
    return Promise.all(experiments.map((experiment) => this.withMetrics(experiment.id)));
  }

  async get(id: string): Promise<ExperimentSummary | null> {
    const experiment = await this.repository.findById(id);
    return experiment ? this.withMetrics(id) : null;
  }

  async getSdkConfig(id: string): Promise<SdkExperimentConfig | null> {
    return this.repository.findSdkConfig(id);
  }

  async updateStatus(id: string, status: ExperimentStatus): Promise<ExperimentSummary | null> {
    const experiment = await this.repository.updateStatus(id, status);
    return experiment ? this.withMetrics(id) : null;
  }

  async track(input: TrackEventPayload): Promise<void> {
    await this.repository.recordEvent(input);
  }

  async evaluate(id: string): Promise<WinnerResult> {
    const experiment = await this.repository.findById(id);

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const metrics = await this.repository.getMetrics(id, experiment.conversionEvent);
    const result = this.winnerDetection.evaluate(metrics);

    if (result.winnerVariantId) {
      await this.repository.markWinner(id, result.winnerVariantId);

      for (const variant of experiment.variants) {
        if (variant.id !== result.winnerVariantId) {
          await this.repository.updateVariantStatus(variant.id, "loser");
        }
      }
    }

    return result;
  }

  async generatePullRequests(id: string, goal: string, allowList: string[]): Promise<ExperimentSummary> {
    const experiment = await this.repository.findById(id);

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const generated = await this.generator.generate({
      experimentId: id,
      goalId: experiment.goalId ?? undefined,
      conversionEvent: experiment.conversionEvent,
      repoFullName: experiment.repoFullName,
      goal,
      allowList,
      variantNames: experiment.variants.map((variant) => variant.name)
    });

    for (const [index, plan] of generated.slice(0, experiment.variants.length).entries()) {
      const variant = experiment.variants[index];
      const pullRequest = await this.pullRequests.createPullRequest({
        repoFullName: experiment.repoFullName,
        title: plan.pullRequestTitle,
        body: plan.pullRequestBody,
        headBranch: plan.branchName,
        baseBranch: "main"
      });

      await this.repository.attachPullRequest(
        variant.id,
        plan.branchName,
        pullRequest.number,
        pullRequest.url
      );
    }

    return this.withMetrics(id);
  }

  async getPullRequestStatuses(id: string): Promise<PullRequestStatus[]> {
    const experiment = await this.repository.findById(id);

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    return Promise.all(
      experiment.variants.map(async (variant) => {
        if (!variant.pullRequestNumber) {
          return {
            variantId: variant.id,
            number: null,
            url: variant.pullRequestUrl,
            state: "unknown",
            mergeable: null,
            title: null
          };
        }

        const status = await this.pullRequests.getPullRequestStatus(
          experiment.repoFullName,
          variant.pullRequestNumber
        );

        return {
          variantId: variant.id,
          number: status.number,
          url: status.url,
          state: status.state,
          mergeable: status.mergeable,
          title: status.title
        };
      })
    );
  }

  async closeLosingPullRequests(id: string): Promise<ExperimentSummary> {
    const experiment = await this.repository.findById(id);

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    for (const variant of experiment.variants) {
      if (variant.status !== "loser" || !variant.pullRequestNumber) {
        continue;
      }

      const status = await this.pullRequests.getPullRequestStatus(
        experiment.repoFullName,
        variant.pullRequestNumber
      );

      if (status.state === "open") {
        await this.pullRequests.closePullRequest(experiment.repoFullName, variant.pullRequestNumber);
      }

      if (variant.branchName && status.state !== "merged") {
        await this.pullRequests.deleteBranch(experiment.repoFullName, variant.branchName);
        await this.repository.updateVariantStatus(variant.id, "reverted");
      }
    }

    return this.withMetrics(id);
  }

  private async withMetrics(id: string): Promise<ExperimentSummary> {
    const experiment = await this.repository.findById(id);

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const metrics = await this.repository.getMetrics(id, experiment.conversionEvent);
    return { ...experiment, metrics };
  }

  private async getGoalOrThrow(id: string): Promise<GoalSummary> {
    const goal = await this.repository.findGoalById(id);

    if (!goal) {
      throw new Error("Goal not found");
    }

    const experiments = await this.repository.findGoalExperiments(id);
    const experimentsWithMetrics = await Promise.all(
      experiments.map((experiment) => this.withMetrics(experiment.id))
    );

    return { ...goal, experiments: experimentsWithMetrics };
  }
}

function createConversionEventName(goalTitle: string) {
  const slug = goalTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return `${slug || "goal"}_conversion`;
}
