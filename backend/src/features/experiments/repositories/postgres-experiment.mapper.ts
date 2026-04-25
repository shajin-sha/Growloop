import type { Experiment, ExperimentVariant } from "../types/experiment.types";

type ExperimentRow = {
  id: string;
  name: string;
  repo_full_name: string;
  conversion_event: string;
  status: Experiment["status"];
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
  created_at: Date;
};

export function mapExperiment(row: ExperimentRow, variants: ExperimentVariant[]): Experiment {
  return {
    id: row.id,
    name: row.name,
    repoFullName: row.repo_full_name,
    conversionEvent: row.conversion_event,
    status: row.status,
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
    createdAt: row.created_at.toISOString()
  };
}
