import { GitBranch, GitPullRequest, Pause, Play, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const bestMetric = experiment.metrics.reduce(
    (best, metric) => (metric.conversionRate > best.conversionRate ? metric : best),
    { conversionRate: 0, conversions: 0, variantId: "", visitors: 0 }
  );
  const bestVariant = experiment.variants.find((variant) => variant.id === bestMetric.variantId);
  const openPullRequests = experiment.variants.filter((variant) => variant.pullRequestUrl).length;
  const createdDate = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short"
  }).format(new Date(experiment.createdAt));

  return (
    <article className="grid gap-5 border-b border-border bg-background p-5 transition hover:bg-muted/40 last:border-b-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.9fr)_minmax(320px,0.7fr)]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-medium">{experiment.name}</h2>
              <ExperimentStatusBadge status={experiment.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>{experiment.repoFullName}</span>
              <span>{experiment.conversionEvent}</span>
              <span>{createdDate}</span>
            </div>
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
            <div
              className={cn(
                "rounded-md border border-border bg-muted/30 p-3",
                variant.id === experiment.winnerVariantId && "border-emerald-300 bg-emerald-50"
              )}
              key={variant.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">{variant.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{variant.weight}%</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                  <GitBranch size={12} />
                  <span className="truncate">{variant.branchName ?? "no branch"}</span>
                </span>
                {variant.pullRequestUrl ? (
                  <a
                    className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                    href={variant.pullRequestUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <GitPullRequest size={12} />
                    PR
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Best rate</p>
            <p className="mt-1 font-mono text-xl tabular-nums">
              {Math.round(bestMetric.conversionRate * 1000) / 10}%
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Pull requests</p>
            <p className="mt-1 font-mono text-xl tabular-nums">{openPullRequests}</p>
          </div>
        </div>
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
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy size={15} />
            <span className="truncate">{bestVariant?.name ?? "No winner yet"}</span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {bestMetric.visitors} visitors tracked
          </p>
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Generation goal</span>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-primary"
            onChange={(event) => setGoal(event.target.value)}
            value={goal}
          />
        </label>
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
