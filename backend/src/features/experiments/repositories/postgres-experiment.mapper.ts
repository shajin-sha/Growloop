import type { Experiment, ExperimentVariant, Goal } from "../types/experiment.types";

type GoalRow = {
  id: string;
  title: string;
  repo_full_name: string;
  conversion_event: string;
  status: Goal["status"];
  created_at: Date;
  updated_at: Date;
};

type ExperimentRow = {
  id: string;
  goal_id: string | null;
  name: string;
  description: string | null;
  repo_full_name: string;
  conversion_event: string;
  status: Experiment["status"];
  traffic_weight: number;
  winner_variant_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type VariantRow = {
  id: string;
  experiment_id: string;
  name: string;
  weight: number;
  status: ExperimentVariant["status"];
  branch_name: string | null;
  pull_request_number: number | null;
  pull_request_url: string | null;
  commit_sha: string | null;
  created_at: Date;
};

export function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    repoFullName: row.repo_full_name,
    conversionEvent: row.conversion_event,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export function mapExperiment(row: ExperimentRow, variants: ExperimentVariant[]): Experiment {
  return {
    id: row.id,
    goalId: row.goal_id,
    name: row.name,
    description: row.description,
    repoFullName: row.repo_full_name,
    conversionEvent: row.conversion_event,
    status: row.status,
    trafficWeight: row.traffic_weight,
    winnerVariantId: row.winner_variant_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    variants
  };
}

export function mapVariant(row: VariantRow): ExperimentVariant {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    name: row.name,
    weight: row.weight,
    status: row.status,
    branchName: row.branch_name,
    pullRequestNumber: row.pull_request_number,
    pullRequestUrl: row.pull_request_url,
    commitSha: row.commit_sha,
    createdAt: row.created_at.toISOString()
  };
}
