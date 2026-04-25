import { useCallback, useEffect, useState } from "react";

import {
  createExperiment,
  evaluateExperiment,
  generateExperiment,
  listExperiments,
  updateExperimentStatus
} from "../api/experimentsApi";
import type {
  CreateExperimentFormValues,
  ExperimentAction,
  ExperimentViewModel
} from "../types/experiment.types";

export function useExperiments() {
  const [experiments, setExperiments] = useState<ExperimentViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setExperiments(await listExperiments());
    } catch {
      setError("Backend is not reachable");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (values: CreateExperimentFormValues) => {
    const experiment = await createExperiment(values);
    setExperiments((current) => [experiment, ...current]);
  };

  const updateStatus = async (id: string, status: ExperimentAction) => {
    const experiment = await updateExperimentStatus(id, status);
    replaceExperiment(setExperiments, experiment);
  };

  const evaluate = async (id: string) => {
    await evaluateExperiment(id);
    await refresh();
  };

  const generate = async (id: string, goal: string) => {
    const experiment = await generateExperiment(id, goal);
    replaceExperiment(setExperiments, experiment);
  };

  return {
    experiments,
    isLoading,
    error,
    create,
    updateStatus,
    evaluate,
    generate,
    refresh
  };
}

function replaceExperiment(
  setExperiments: (update: (current: ExperimentViewModel[]) => ExperimentViewModel[]) => void,
  experiment: ExperimentViewModel
) {
  setExperiments((current) => current.map((item) => (item.id === experiment.id ? experiment : item)));
}
