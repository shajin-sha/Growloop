import type { ExperimentStatus } from "@growloop/shared";

import { cn } from "@/lib/utils";

const labels: Record<ExperimentStatus, string> = {
  draft: "Draft",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  killed: "Killed"
};

const styles: Record<ExperimentStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  running: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-blue-200 bg-blue-50 text-blue-700",
  killed: "border-red-200 bg-red-50 text-red-700"
};

export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
