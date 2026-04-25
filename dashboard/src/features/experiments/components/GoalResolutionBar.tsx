import { Check, Loader2, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ExperimentResolutionAction } from "./ExperimentRow";

type SelectionEntry = { id: string; name: string; action: ExperimentResolutionAction };

type GoalResolutionBarProps = {
    goalTitle: string;
    selections: SelectionEntry[];
    totalExperiments: number;
    isSubmitting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const actionConfig: Record<ExperimentResolutionAction, { label: string; icon: typeof Check; color: string }> = {
    keep: { label: "Keep", icon: Check, color: "text-emerald-600" },
    stop: { label: "Stop", icon: Square, color: "text-amber-600" },
    kill: { label: "Kill", icon: X, color: "text-red-600" }
};

export function GoalResolutionBar({
    goalTitle,
    selections,
    totalExperiments,
    isSubmitting,
    onConfirm,
    onCancel
}: GoalResolutionBarProps) {
    const pending = totalExperiments - selections.length;
    const keepCount = selections.filter((s) => s.action === "keep").length;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 shadow-lg backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{goalTitle}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {selections.map((s) => {
                            const cfg = actionConfig[s.action];
                            const Icon = cfg.icon;
                            return (
                                <span className={`inline-flex items-center gap-1 text-xs ${cfg.color}`} key={s.id}>
                                    <Icon size={11} />
                                    {s.name}
                                </span>
                            );
                        })}
                        {pending > 0 ? (
                            <span className="text-xs text-muted-foreground">{pending} unselected (will be stopped)</span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {keepCount === 0 ? (
                        <p className="text-xs text-muted-foreground">No experiments kept — all will be stopped</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Codex will build a PR with {keepCount} experiment{keepCount !== 1 ? "s" : ""}
                        </p>
                    )}
                    <Button disabled={isSubmitting} onClick={onCancel} size="sm" variant="outline">
                        Cancel
                    </Button>
                    <Button disabled={isSubmitting} onClick={onConfirm} size="sm">
                        {isSubmitting ? <Loader2 className="animate-spin" size={13} /> : null}
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
}
