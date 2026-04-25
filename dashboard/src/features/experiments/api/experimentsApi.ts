import type { ExperimentSummary } from "@growloop/shared";

import { dashboardLogger } from "@/lib/logger";

import type { CreateExperimentFormValues, ExperimentAction } from "../types/experiment.types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

type ExperimentResponse = {
  experiment: ExperimentSummary;
};

type ExperimentsResponse = {
  experiments: ExperimentSummary[];
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

export async function createExperiment(values: CreateExperimentFormValues) {
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
