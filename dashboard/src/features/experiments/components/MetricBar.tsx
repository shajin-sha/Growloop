import type { ExperimentMetric, ExperimentVariant } from "@growloop/shared";

type MetricBarProps = {
  metric: ExperimentMetric;
  variant: ExperimentVariant;
};

export function MetricBar({ metric, variant }: MetricBarProps) {
  const percentage = Math.round(metric.conversionRate * 1000) / 10;
  const cappedPercentage = Math.min(percentage, 100);

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{variant.name}</p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {metric.visitors} visitors / {metric.conversions} conversions
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums">{percentage}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${cappedPercentage}%` }} />
      </div>
    </div>
  );
}
