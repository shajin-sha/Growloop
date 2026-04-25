import type { ExperimentSummary, GoalSummary } from "@growloop/shared";

import { dashboardLogger } from "@/lib/logger";

import type { CreateGoalFormValues, ExperimentAction, GoalAction } from "../types/experiment.types";

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "https://hackathon.shajinkp.com" : "http://localhost:4100");

type ExperimentResponse = {
  experiment: ExperimentSummary;
};

type ExperimentsResponse = {
  experiments: ExperimentSummary[];
};

type GoalResponse = {
  goal: GoalSummary;
};

type GoalsResponse = {
  goals: GoalSummary[];
};

export type GitHubAppInfo = {
  configured: boolean;
  installUrl: string | null;
  installation: {
    installationId: number;
    accountLogin: string;
    targetType: string;
  } | null;
  slug: string | null;
};

type GitHubAppResponse = {
  app: GitHubAppInfo;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    dashboardLogger.warn("experiments-api", "Request failed", {
      path,
      status: response.status
    });
    throw new Error("Growloop API request failed");
  }

  return response.json() as Promise<T>;
}

export async function listExperiments() {
  const body = await request<ExperimentsResponse>("/api/experiments");
  return body.experiments;
}

export async function listGoals() {
  const body = await request<GoalsResponse>("/api/goals");
  return body.goals;
}

export async function getGitHubAppInfo() {
  const body = await request<GitHubAppResponse>("/api/github/app");
  return body.app;
}

export async function registerGitHubInstallation(installationId: number, setupAction?: string) {
  await request<{ installation: GitHubAppInfo["installation"] }>("/api/github/installations", {
    method: "POST",
    body: JSON.stringify({ installationId, setupAction })
  });
}

export async function createGoal(values: CreateGoalFormValues) {
  const body = await request<GoalResponse>("/api/goals", {
    method: "POST",
    body: JSON.stringify({
      title: values.title
    })
  });

  return body.goal;
}

export async function createExperiment(values: {
  goalId?: string | null;
  name: string;
  repoFullName: string;
  conversionEvent: string;
}) {
  const body = await request<ExperimentResponse>("/api/experiments", {
    method: "POST",
    body: JSON.stringify({
      ...values,
      variants: [
        { name: "Control", weight: 50 },
        { name: "Variant", weight: 50 }
      ]
    })
  });

  return body.experiment;
}

export async function deleteGoal(id: string): Promise<void> {
  await request<void>(`/api/goals/${id}`, { method: "DELETE" });
}

export type GenerationStepStatus = {
  experimentId: string;
  step: "planning" | "cloning" | "generating" | "pushing" | "opening_pr" | "done" | "failed";
  message: string;
  updatedAt: string;
};

export type GoalGenerationStatus = {
  goalId: string;
  experiments: GenerationStepStatus[];
} | null;

export async function getGoalGenerationStatus(id: string): Promise<GoalGenerationStatus> {
  const body = await request<{ status: GoalGenerationStatus }>(`/api/goals/${id}/generation-status`);
  return body.status;
}

export async function updateGoalStatus(id: string, status: GoalAction) {
  const body = await request<GoalResponse>(`/api/goals/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  return body.goal;
}

export async function updateExperimentStatus(id: string, status: ExperimentAction) {
  const body = await request<ExperimentResponse>(`/api/experiments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  return body.experiment;
}

export async function evaluateExperiment(id: string) {
  await request<{ result: unknown }>(`/api/experiments/${id}/evaluate`, {
    method: "POST"
  });
}

export async function resolveGoal(goalId: string, experiments: Array<{ id: string; action: "keep" | "stop" | "kill" }>) {
  const body = await request<{ result: { goalId: string; status: string; message: string } }>(`/api/goals/${goalId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ experiments })
  });
  return body.result;
}

export async function generateExperiment(id: string, goal: string) {
  const body = await request<ExperimentResponse>(`/api/experiments/${id}/generate`, {
    method: "POST",
    body: JSON.stringify({
      goal,
      allowList: ["src", "app", "components", "pages"]
    })
  });

  return body.experiment;
}
