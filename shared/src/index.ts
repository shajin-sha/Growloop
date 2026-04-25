export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "killed";

export type VariantStatus = "active" | "winner" | "loser" | "reverted";

export type ExperimentVariant = {
  id: string;
  experimentId: string;
  name: string;
  weight: number;
  status: VariantStatus;
  branchName: string | null;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  createdAt: string;
};

export type PullRequestStatus = {
  variantId: string;
  number: number | null;
  url: string | null;
  state: "open" | "closed" | "merged" | "unknown";
  mergeable: boolean | null;
  title: string | null;
};

export type Experiment = {
  id: string;
  name: string;
  repoFullName: string;
  conversionEvent: string;
  status: ExperimentStatus;
  winnerVariantId: string | null;
  createdAt: string;
  updatedAt: string;
  variants: ExperimentVariant[];
};

export type ExperimentMetric = {
  variantId: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
};

export type ExperimentSummary = Experiment & {
  metrics: ExperimentMetric[];
};

export type SdkExperimentConfig = {
  id: string;
  conversionEvent: string;
  status: ExperimentStatus;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
  }>;
};

export type TrackEventPayload = {
  experimentId: string;
  variantId: string;
  visitorId: string;
  eventName: string;
  url?: string;
  metadata?: Record<string, unknown>;
};
