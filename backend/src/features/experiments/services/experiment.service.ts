import type { PullRequestClient } from "../../integrations/github/github-app-client";
import type { VariantGenerator } from "../../integrations/e2b-codex/e2b-codex-generator";
import type { ExperimentRepository } from "../repositories/experiment.repository";
import type {
  CreateExperimentInput,
  ExperimentSummary,
  ExperimentStatus,
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
  ) {}

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
      repoFullName: experiment.repoFullName,
      goal,
      allowList
    });

    for (const plan of generated.slice(0, experiment.variants.length)) {
      const variant = experiment.variants[generated.indexOf(plan)];
      const pullRequest = await this.pullRequests.createPullRequest({
        repoFullName: experiment.repoFullName,
        title: plan.pullRequestTitle,
        body: plan.pullRequestBody,
        headBranch: plan.branchName,
        baseBranch: "main"
      });

      await this.repository.attachPullRequest(variant.id, plan.branchName, pullRequest.url);
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
}
