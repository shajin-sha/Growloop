import type {
  Experiment,
  Goal,
  GoalStatus,
  GoalSummary,
  ExperimentMetric,
  ExperimentStatus,
  ExperimentSummary,
  ExperimentVariant,
  PullRequestStatus,
  SdkGoalConfig,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
} from "@growloop/shared";

export type {
  Experiment,
  Goal,
  GoalStatus,
  GoalSummary,
  ExperimentMetric,
  ExperimentStatus,
  ExperimentSummary,
  ExperimentVariant,
  PullRequestStatus,
  SdkGoalConfig,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
};

export type CreateExperimentInput = {
  goalId?: string | null;
  name: string;
  description?: string | null;
  repoFullName: string;
  conversionEvent: string;
  trafficWeight?: number;
  variants: Array<{
    name: string;
    weight: number;
  }>;
};

export type CreateGoalInput = {
  title: string;
  repoFullName?: string;
  conversionEvent?: string;
  experimentCount?: number;
};

export type GoalExperimentPlan = {
  name: string;
  description: string;
};

export type CreateGoalRecordInput = {
  title: string;
  repoFullName: string;
  conversionEvent: string;
  experimentPlans: GoalExperimentPlan[];
};

export type UpdateExperimentStatusInput = {
  status: ExperimentStatus;
};

export type WinnerResult = {
  winnerVariantId: string | null;
  confidence: number;
  reason: string;
};
