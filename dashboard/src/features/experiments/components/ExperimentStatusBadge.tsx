import type { ExperimentStatus } from "@growloop/shared";

const labels: Record<ExperimentStatus, string> = {
  draft: "Draft",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  killed: "Killed"
};

export function ExperimentStatusBadge({ status }: { status: ExperimentStatus }) {
  return (
    <span className="rounded-sm border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
      {labels[status]}
    </span>
  );
}
