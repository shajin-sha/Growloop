import {
  ArrowUpRight,
  GitBranch,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X
} from "lucide-react";
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

function humanizeEvent(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatGoal(conversionEvent: string) {
  const eventName = humanizeEvent(conversionEvent);

  return eventName ? `Higher ${eventName} rate` : "Higher conversion rate";
}

export function ExperimentRow({
  experiment,
  onEvaluate,
  onGenerate,
  onStatus
}: ExperimentRowProps) {
  const defaultGoal = formatGoal(experiment.conversionEvent);
  const [goal, setGoal] = useState(defaultGoal);
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
  const totalVisitors = experiment.metrics.reduce((total, metric) => total + metric.visitors, 0);
  const totalConversions = experiment.metrics.reduce((total, metric) => total + metric.conversions, 0);
  const bestRate = Math.round(bestMetric.conversionRate * 1000) / 10;

  return (
    <article className="group flex min-h-[420px] flex-col rounded-lg border border-border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ExperimentStatusBadge status={experiment.status} />
            <span className="font-mono text-xs text-muted-foreground">{createdDate}</span>
          </div>
          <h2 className="mt-4 line-clamp-2 text-xl font-medium leading-snug">{experiment.name}</h2>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{experiment.repoFullName}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            aria-label="Start experiment"
            onClick={() => onStatus(experiment.id, "running")}
            size="icon"
            variant="ghost"
          >
            <Play size={16} />
          </Button>
          <Button
            aria-label="Pause experiment"
            onClick={() => onStatus(experiment.id, "paused")}
            size="icon"
            variant="ghost"
          >
            <Pause size={16} />
          </Button>
          <Button
            aria-label="Kill experiment"
            onClick={() => onStatus(experiment.id, "killed")}
            size="icon"
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target size={15} />
          <span className="truncate">{defaultGoal}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Patching variants for {humanizeEvent(experiment.conversionEvent) || "conversion"} and comparing the cleanest winner.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Best</p>
          <p className="mt-1 font-mono text-lg tabular-nums">{bestRate}%</p>
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Visitors</p>
          <p className="mt-1 font-mono text-lg tabular-nums">{totalVisitors}</p>
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">PRs</p>
          <p className="mt-1 font-mono text-lg tabular-nums">{openPullRequests}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {experiment.variants.map((variant) => {
          const metric = metricsByVariant.get(variant.id) ?? {
            variantId: variant.id,
            visitors: 0,
            conversions: 0,
            conversionRate: 0
          };

          return <MetricBar compact key={variant.id} metric={metric} variant={variant} />;
        })}
      </div>

      <div className="mt-4 grid gap-2">
        {experiment.variants.map((variant) => (
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2",
              variant.id === experiment.winnerVariantId && "border-emerald-300 bg-emerald-50"
            )}
            key={variant.id}
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-sm">
              <GitBranch className="shrink-0 text-muted-foreground" size={13} />
              <span className="truncate">{variant.name}</span>
            </span>
            {variant.pullRequestUrl ? (
              <a
                className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-foreground underline-offset-4 hover:underline"
                href={variant.pullRequestUrl}
                rel="noreferrer"
                target="_blank"
              >
                PR
                <ArrowUpRight size={12} />
              </a>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">{variant.weight}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-3 rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy size={15} />
            <span className="truncate">{bestVariant?.name ?? "Waiting for signal"}</span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {totalConversions} conversions tracked
          </p>
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Patch goal</span>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-primary"
            onChange={(event) => setGoal(event.target.value)}
            value={goal}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onGenerate(experiment.id, goal)} variant="secondary">
            <Sparkles size={16} />
            Patch
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
