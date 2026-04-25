import { useCallback, useEffect, useRef, useState } from "react";

import { getGoalGenerationStatus, type GenerationStepStatus } from "../api/experimentsApi";

type GoalStatuses = Record<string, Record<string, GenerationStepStatus>>;

export function useGenerationStatus(goalIds: string[]) {
    const [statuses, setStatuses] = useState<GoalStatuses>({});
    const activeGoals = useRef(new Set<string>());

    const startPolling = useCallback((goalId: string) => {
        activeGoals.current.add(goalId);
    }, []);

    useEffect(() => {
        // Poll for any goals that have experiments without PRs (likely generating)
        for (const goalId of goalIds) {
            activeGoals.current.add(goalId);
        }
    }, [goalIds]);

    useEffect(() => {
        if (activeGoals.current.size === 0) return;

        const interval = window.setInterval(async () => {
            const goalsToRemove: string[] = [];

            for (const goalId of activeGoals.current) {
                try {
                    const status = await getGoalGenerationStatus(goalId);

                    if (!status || status.experiments.length === 0) continue;

                    setStatuses((prev) => {
                        const goalStatuses: Record<string, GenerationStepStatus> = {};
                        for (const exp of status.experiments) {
                            goalStatuses[exp.experimentId] = exp;
                        }
                        return { ...prev, [goalId]: goalStatuses };
                    });

                    // Stop polling if all experiments are done or failed
                    const allDone = status.experiments.every(
                        (e) => e.step === "done" || e.step === "failed"
                    );
                    if (allDone) {
                        goalsToRemove.push(goalId);
                    }
                } catch {
                    // Ignore polling errors
                }
            }

            for (const id of goalsToRemove) {
                activeGoals.current.delete(id);
            }
        }, 3000);

        return () => window.clearInterval(interval);
    }, []);

    const getExperimentStatus = useCallback(
        (goalId: string, experimentId: string): GenerationStepStatus | null => {
            return statuses[goalId]?.[experimentId] ?? null;
        },
        [statuses]
    );

    return { getExperimentStatus, startPolling };
}
