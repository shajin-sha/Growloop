export type GenerationStep =
    | "planning"
    | "cloning"
    | "generating"
    | "pushing"
    | "opening_pr"
    | "done"
    | "failed";

export type ExperimentGenerationStatus = {
    experimentId: string;
    step: GenerationStep;
    message: string;
    updatedAt: string;
};

export type GoalGenerationStatus = {
    goalId: string;
    experiments: ExperimentGenerationStatus[];
};

const statusMap = new Map<string, GoalGenerationStatus>();

export function updateGenerationStatus(
    goalId: string,
    experimentId: string,
    step: GenerationStep,
    message: string
) {
    let goal = statusMap.get(goalId);

    if (!goal) {
        goal = { goalId, experiments: [] };
        statusMap.set(goalId, goal);
    }

    const existing = goal.experiments.find((e) => e.experimentId === experimentId);

    if (existing) {
        existing.step = step;
        existing.message = message;
        existing.updatedAt = new Date().toISOString();
    } else {
        goal.experiments.push({
            experimentId,
            step,
            message,
            updatedAt: new Date().toISOString()
        });
    }
}

export function getGenerationStatus(goalId: string): GoalGenerationStatus | null {
    return statusMap.get(goalId) ?? null;
}

export function clearGenerationStatus(goalId: string) {
    statusMap.delete(goalId);
}
