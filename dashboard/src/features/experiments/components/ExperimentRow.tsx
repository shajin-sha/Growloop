import { GitPullRequest, Pause, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ExperimentStatusBadge } from "./ExperimentStatusBadge";
import { MetricBar } from "./MetricBar";
import type { ExperimentAction, ExperimentViewModel } from "../types/experiment.types";

type ExperimentRowProps = {
  experiment: ExperimentViewModel;
  onEvaluate(id: string): Promise<void>;
  onGenerate(id: string, goal: string): Promise<void>;
  onStatus(id: string, status: ExperimentAction): Promise<void>;
};

export function ExperimentRow({
  experiment,
  onEvaluate,
  onGenerate,
  onStatus
}: ExperimentRowProps) {
  const [goal, setGoal] = useState(`Improve ${experiment.conversionEvent} conversion`);
  const metricsByVariant = new Map(experiment.metrics.map((metric) => [metric.variantId, metric]));

  return (
    <article className="grid gap-5 border-b border-border p-5 last:border-b-0 xl:grid-cols-[1.1fr_1fr_360px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{experiment.name}</h2>
              <ExperimentStatusBadge status={experiment.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {experiment.repoFullName} / {experiment.conversionEvent}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              aria-label="Start experiment"
              onClick={() => onStatus(experiment.id, "running")}
              size="icon"
              variant="outline"
            >
              <Play size={16} />
            </Button>
            <Button
              aria-label="Pause experiment"
              onClick={() => onStatus(experiment.id, "paused")}
              size="icon"
              variant="outline"
            >
              <Pause size={16} />
            </Button>
            <Button
              aria-label="Kill experiment"
              onClick={() => onStatus(experiment.id, "killed")}
              size="icon"
              variant="destructive"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {experiment.variants.map((variant) => (
            <div className="rounded-md border border-border p-3" key={variant.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">{variant.name}</span>
                <span className="text-xs text-muted-foreground">{variant.weight}%</span>
              </div>
              {variant.pullRequestUrl ? (
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                  href={variant.pullRequestUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <GitPullRequest size={12} />
                  PR
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {experiment.variants.map((variant) => {
          const metric = metricsByVariant.get(variant.id) ?? {
            variantId: variant.id,
            visitors: 0,
            conversions: 0,
            conversionRate: 0
          };

          return <MetricBar key={variant.id} metric={metric} variant={variant} />;
        })}
      </div>

      <div className="space-y-3">
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          onChange={(event) => setGoal(event.target.value)}
          value={goal}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onGenerate(experiment.id, goal)} variant="secondary">
            <Sparkles size={16} />
            Generate
          </Button>
          <Button onClick={() => onEvaluate(experiment.id)} variant="outline">
            <RotateCcw size={16} />
            Evaluate
          </Button>
        </div>
      </div>
    </article>
  );
}
