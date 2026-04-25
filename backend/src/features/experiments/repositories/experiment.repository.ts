import type {
  CreateExperimentInput,
  CreateGoalRecordInput,
  Experiment,
  ExperimentMetric,
  ExperimentStatus,
  Goal,
  GoalStatus,
  SdkGoalConfig,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
} from "../types/experiment.types";

export interface ExperimentRepository {
  createGoal(input: CreateGoalRecordInput): Promise<Goal>;
  deleteGoal(id: string): Promise<boolean>;
  findGoals(): Promise<Goal[]>;
  findGoalById(id: string): Promise<Goal | null>;
  findGoalExperiments(goalId: string): Promise<Experiment[]>;
  findGoalSdkConfig(id: string): Promise<SdkGoalConfig | null>;
  create(input: CreateExperimentInput): Promise<Experiment>;
  findAll(): Promise<Experiment[]>;
  findById(id: string): Promise<Experiment | null>;
  findSdkConfig(id: string): Promise<SdkExperimentConfig | null>;
  recordEvent(input: TrackEventPayload): Promise<void>;
  getMetrics(experimentId: string, conversionEvent: string): Promise<ExperimentMetric[]>;
  updateGoalStatus(id: string, status: GoalStatus): Promise<Goal | null>;
  updateStatus(id: string, status: ExperimentStatus): Promise<Experiment | null>;
  markWinner(experimentId: string, winnerVariantId: string): Promise<Experiment | null>;
  updateVariantStatus(id: string, status: VariantStatus): Promise<void>;
  attachPullRequest(
    variantId: string,
    branchName: string,
    pullRequestNumber: number,
    pullRequestUrl: string
  ): Promise<void>;
  attachCommitSha(variantId: string, commitSha: string): Promise<void>;
}
