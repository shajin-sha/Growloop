import { useCallback, useEffect, useState } from "react";

import {
  createGoal,
  deleteGoal,
  evaluateExperiment,
  generateExperiment,
  listGoals,
  resolveGoal,
  updateGoalStatus,
  updateExperimentStatus
} from "../api/experimentsApi";
import type {
  CreateGoalFormValues,
  ExperimentAction,
  GoalAction,
  GoalViewModel
} from "../types/experiment.types";

export function useExperiments() {
  const [goals, setGoals] = useState<GoalViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setGoals(await listGoals());
    } catch {
      setError("Backend is not reachable");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (values: CreateGoalFormValues) => {
    const optimisticGoal = createOptimisticGoal(values.title);
    setGoals((current) => [optimisticGoal, ...current]);
    setError(null);

    try {
      const [goal] = await Promise.all([createGoal(values), waitForPlanningPreview()]);
      replaceGoal(setGoals, goal, optimisticGoal.id);
    } catch {
      setGoals((current) => current.filter((goal) => goal.id !== optimisticGoal.id));
      setError("Goal could not be created");
    }
  };

  const updateGoal = async (id: string, status: GoalAction) => {
    const goal = await updateGoalStatus(id, status);
    replaceGoal(setGoals, goal);
  };

  const removeGoal = async (id: string) => {
    setGoals((current) => current.filter((goal) => goal.id !== id));
    setError(null);

    try {
      await deleteGoal(id);
    } catch {
      setError("Goal could not be deleted");
      await refresh();
    }
  };

  const updateStatus = async (id: string, status: ExperimentAction) => {
    const experiment = await updateExperimentStatus(id, status);
    replaceExperiment(setGoals, experiment);
  };

  const evaluate = async (id: string) => {
    await evaluateExperiment(id);
    await refresh();
  };

  const generate = async (id: string, goal: string) => {
    const experiment = await generateExperiment(id, goal);
    replaceExperiment(setGoals, experiment);
  };

  const resolve = async (goalId: string, experiments: Array<{ id: string; action: "keep" | "stop" | "kill" }>) => {
    await resolveGoal(goalId, experiments);
    await refresh();
  };

  return {
    goals,
    isLoading,
    error,
    create,
    updateGoal,
    removeGoal,
    updateStatus,
    evaluate,
    generate,
    resolve,
    refresh
  };
}

function replaceGoal(
  setGoals: (update: (current: GoalViewModel[]) => GoalViewModel[]) => void,
  goal: GoalViewModel,
  replaceId = goal.id
) {
  setGoals((current) => current.map((item) => (item.id === replaceId ? goal : item)));
}

function replaceExperiment(
  setGoals: (update: (current: GoalViewModel[]) => GoalViewModel[]) => void,
  experiment: GoalViewModel["experiments"][number]
) {
  setGoals((current) =>
    current.map((goal) => ({
      ...goal,
      experiments: goal.experiments.map((item) => (item.id === experiment.id ? experiment : item))
    }))
  );
}

function waitForPlanningPreview() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 1400);
  });
}

function createOptimisticGoal(title: string): GoalViewModel {
  const now = new Date().toISOString();
  const goalId = `pending-goal-${crypto.randomUUID()}`;

  return {
    id: goalId,
    title,
    repoFullName: "",
    conversionEvent: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    isPending: true,
    experiments: Array.from({ length: 4 }, (_, index) => {
      const experimentId = `${goalId}-experiment-${index + 1}`;

      return {
        id: experimentId,
        goalId,
        name: `Experiment ${index + 1}`,
        description: null,
        repoFullName: "",
        conversionEvent: "",
        status: "draft",
        trafficWeight: 1,
        winnerVariantId: null,
        createdAt: now,
        updatedAt: now,
        isPending: true,
        variants: [],
        metrics: []
      };
    })
  };
}
