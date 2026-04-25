import type {
  Experiment,
  ExperimentMetric,
  ExperimentStatus,
  ExperimentSummary,
  ExperimentVariant,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
} from "@growloop/shared";

export type {
  Experiment,
  ExperimentMetric,
  ExperimentStatus,
  ExperimentSummary,
  ExperimentVariant,
  SdkExperimentConfig,
  TrackEventPayload,
  VariantStatus
};

export type CreateExperimentInput = {
  name: string;
  repoFullName: string;
  conversionEvent: string;
  variants: Array<{
    name: string;
    weight: number;
  }>;
};

export type UpdateExperimentStatusInput = {
  status: ExperimentStatus;
};

export type WinnerResult = {
  winnerVariantId: string | null;
  confidence: number;
  reason: string;
};
