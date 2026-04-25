import type { ExperimentMetric, ExperimentVariant } from "@growloop/shared";

type MetricBarProps = {
  metric: ExperimentMetric;
  variant: ExperimentVariant;
};

export function MetricBar({ metric, variant }: MetricBarProps) {
  const percentage = Math.round(metric.conversionRate * 1000) / 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{variant.name}</p>
          <p className="text-xs text-muted-foreground">
            {metric.visitors} visitors / {metric.conversions} conversions
          </p>
        </div>
        <span className="shrink-0 tabular-nums">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-muted">
        <div className="h-full bg-primary" style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}
