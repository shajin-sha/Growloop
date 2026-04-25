import type { ExperimentSummary, GoalSummary, GoalStatus } from "@growloop/shared";

export type CreateGoalFormValues = {
  title: string;
};

export type ExperimentAction = "running" | "paused" | "killed";
export type GoalAction = Extract<GoalStatus, "running" | "paused" | "killed">;

export type ExperimentViewModel = ExperimentSummary & {
  isPending?: boolean;
};

export type GoalViewModel = Omit<GoalSummary, "experiments"> & {
  experiments: ExperimentViewModel[];
  isPending?: boolean;
};
