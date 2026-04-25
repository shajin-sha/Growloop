import type {
  CreateExperimentInput,
  Experiment,
  ExperimentMetric,
  ExperimentStatus,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
} from "../types/experiment.types";

export interface ExperimentRepository {
  create(input: CreateExperimentInput): Promise<Experiment>;
  findAll(): Promise<Experiment[]>;
  findById(id: string): Promise<Experiment | null>;
  findSdkConfig(id: string): Promise<SdkExperimentConfig | null>;
  recordEvent(input: TrackEventPayload): Promise<void>;
  getMetrics(experimentId: string, conversionEvent: string): Promise<ExperimentMetric[]>;
  updateStatus(id: string, status: ExperimentStatus): Promise<Experiment | null>;
  markWinner(experimentId: string, winnerVariantId: string): Promise<Experiment | null>;
  updateVariantStatus(id: string, status: VariantStatus): Promise<void>;
  attachPullRequest(variantId: string, branchName: string, pullRequestUrl: string): Promise<void>;
}
