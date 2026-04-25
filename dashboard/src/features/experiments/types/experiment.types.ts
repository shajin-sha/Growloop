import type { ExperimentSummary } from "@growloop/shared";

export type CreateExperimentFormValues = {
  name: string;
  repoFullName: string;
  conversionEvent: string;
};

export type ExperimentAction = "running" | "paused" | "killed";

export type ExperimentViewModel = ExperimentSummary;
