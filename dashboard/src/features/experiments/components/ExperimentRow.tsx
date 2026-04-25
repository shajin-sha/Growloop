import { ArrowUpRight, BarChart3, ChevronDown, GitPullRequest, Loader2, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { GenerationStepStatus } from "../api/experimentsApi";
import type { ExperimentAction, ExperimentViewModel } from "../types/experiment.types";

type ExperimentRowProps = {
  experiment: ExperimentViewModel;
  generationStatus?: GenerationStepStatus | null;
  goalTitle?: string;
  onEvaluate?: (id: string) => Promise<void>;
  onGenerate?: (id: string, goal: string) => Promise<void>;
  onStatus?: (id: string, status: ExperimentAction) => Promise<void>;
};

function formatRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function getPerformanceTone(uplift: number) {
  if (uplift > 0) {
    return {
      metricPanel: "border-emerald-100 bg-emerald-50/45",
      metricText: "text-emerald-700"
    };
  }

  if (uplift < 0) {
    return {
      metricPanel: "border-red-100 bg-red-50/45",
      metricText: "text-red-700"
    };
  }

  return {
    metricPanel: "border-border bg-muted/50",
    metricText: "text-foreground"
  };
}

const planningSteps = [
  "Reading goal",
  "Drafting experiment angle",
  "Preparing Codex context",
  "Saving experiment plan"
];

export function ExperimentRow({
  experiment,
  generationStatus,
  goalTitle,
  onEvaluate,
  onGenerate,
  onStatus
}: ExperimentRowProps) {
  if (experiment.isPending) {
    return <PendingExperimentCard experimentName={experiment.name} />;
  }

  const bestMetric = experiment.metrics.reduce(
    (best, metric) => (metric.conversionRate > best.conversionRate ? metric : best),
    { conversionRate: 0, conversions: 0, variantId: "", visitors: 0 }
  );
  const bestVariant = experiment.variants.find((variant) => variant.id === bestMetric.variantId);
  const pullRequestUrl = experiment.variants.find((variant) => variant.pullRequestUrl)?.pullRequestUrl;
  const createdDate = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short"
  }).format(new Date(experiment.createdAt));
  const totalVisitors = experiment.metrics.reduce((total, metric) => total + metric.visitors, 0);
  const totalConversions = experiment.metrics.reduce((total, metric) => total + metric.conversions, 0);
  const bestRate = formatRate(bestMetric.conversionRate);
  const controlMetric = experiment.metrics[0];
  const baselineRate = controlMetric?.conversionRate ?? 0;
  const baselineRateLabel = formatRate(baselineRate);
  const uplift =
    baselineRate > 0
      ? Math.round(((bestMetric.conversionRate - baselineRate) / baselineRate) * 100)
      : 0;
  const expectedConversionsAtBaseline = Math.round(bestMetric.visitors * baselineRate);
  const addedConversions = Math.max(bestMetric.conversions - expectedConversionsAtBaseline, 0);
  const performanceTone = getPerformanceTone(uplift);
  const canManage = ["draft", "running", "paused"].includes(experiment.status);
  const primaryAction = experiment.status === "running" ? "paused" : "running";
  const primaryActionLabel = experiment.status === "running" ? "Pause" : "Run";
  const PrimaryActionIcon = experiment.status === "running" ? Pause : Play;
  const runStateLabel = experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1);

  const updateStatus = (status: ExperimentAction) => {
    if (!onStatus) return;
    void onStatus(experiment.id, status);
  };

  const generatePullRequest = () => {
    if (!onGenerate) return;
    void onGenerate(experiment.id, `${goalTitle ?? experiment.name}: ${experiment.name}`);
  };

  const evaluateExperiment = () => {
    if (!onEvaluate) return;
    void onEvaluate(experiment.id);
  };

  return (
    <article className="group cursor-pointer rounded-[12px] border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 line-clamp-2 text-base font-medium leading-snug">{experiment.name}</h2>
        {canManage ? (
          <ExperimentActionSplitButton
            menuLabel={`More actions for ${experiment.name}`}
            onEvaluate={evaluateExperiment}
            onGenerate={generatePullRequest}
            onKill={() => updateStatus("killed")}
            onPause={() => updateStatus("paused")}
            onPrimaryAction={() => updateStatus(primaryAction)}
            onRun={() => updateStatus("running")}
            primaryIcon={<PrimaryActionIcon size={13} />}
            primaryLabel={primaryActionLabel}
            statusLabel={runStateLabel}
          />
        ) : null}
      </div>
      <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
        {experiment.description ?? "Codex-generated patch"}
      </p>

      {generationStatus && generationStatus.step !== "done" ? (
        <div className={cn(
          "mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
          generationStatus.step === "failed"
            ? "border border-red-200 bg-red-50 text-red-700"
            : "border border-amber-200 bg-amber-50 text-amber-800"
        )}>
          {generationStatus.step !== "failed" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : null}
          <span className="truncate">{generationStatus.message}</span>
        </div>
      ) : null}

      <div className={cn(
        "mt-4 grid grid-cols-[1fr_auto] items-end gap-3 rounded-md border px-3 py-2.5",
        performanceTone.metricPanel
      )}>
        <div>
          <p className="text-[11px] text-muted-foreground">Lift</p>
          <p className={cn("mt-0.5 font-mono text-2xl tabular-nums", performanceTone.metricText)}>
            {uplift > 0 ? `+${uplift}%` : `${uplift}%`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg tabular-nums">{bestRate}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">vs {baselineRateLabel}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border py-2">
        <div>
          <p className="font-mono text-xs tabular-nums">{totalVisitors}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Visitors</p>
        </div>
        <div>
          <p className="font-mono text-xs tabular-nums">+{addedConversions}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Added</p>
        </div>
        <div>
          <p className="truncate text-xs">{bestVariant?.name ?? "Learning"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Leader</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-muted-foreground">
            {createdDate} / {totalConversions} tracked
          </p>
        </div>
        {pullRequestUrl ? (
          <a
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
            href={pullRequestUrl}
            rel="noreferrer"
            target="_blank"
          >
            PR
            <ArrowUpRight size={12} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function PendingExperimentCard({ experimentName }: { experimentName: string }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % planningSteps.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <article className="overflow-hidden rounded-[12px] border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium leading-snug text-muted-foreground">{experimentName}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{planningSteps[stepIndex]}</p>
        </div>
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
      </div>

      <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/15" />
        <div className="mt-3 h-7 w-20 animate-pulse rounded-full bg-muted-foreground/20" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded-full bg-muted-foreground/15" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border py-3">
        <div className="h-8 animate-pulse rounded-md bg-muted" />
        <div className="h-8 animate-pulse rounded-md bg-muted" />
        <div className="h-8 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-muted" />
    </article>
  );
}

type ExperimentActionSplitButtonProps = {
  menuLabel: string;
  onEvaluate: () => void;
  onGenerate: () => void;
  onKill: () => void;
  onPause: () => void;
  onPrimaryAction: () => void;
  onRun: () => void;
  primaryIcon: ReactNode;
  primaryLabel: string;
  statusLabel: string;
};

function ExperimentActionSplitButton({
  menuLabel,
  onEvaluate,
  onGenerate,
  onKill,
  onPause,
  onPrimaryAction,
  onRun,
  primaryIcon,
  primaryLabel,
  statusLabel
}: ExperimentActionSplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (buttonRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMenuAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div
      className="relative ml-auto inline-flex shrink-0 items-stretch rounded-md border border-border bg-background shadow-sm"
      ref={buttonRef}
    >
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-l-md px-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={(event) => {
          event.stopPropagation();
          onPrimaryAction();
          setIsOpen(false);
        }}
        type="button"
      >
        {primaryIcon}
        {primaryLabel}
      </button>
      <button
        aria-expanded={isOpen}
        aria-label={menuLabel}
        className="flex h-8 w-8 items-center justify-center rounded-r-md border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <ChevronDown size={14} />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-9 z-10 grid w-52 overflow-hidden rounded-md border border-border bg-background p-1 shadow-lg">
          <SplitButtonMenuItem
            description="Create the agent PR"
            icon={<GitPullRequest size={13} />}
            onClick={() => handleMenuAction(onGenerate)}
            title="Generate PR"
          />
          <SplitButtonMenuItem
            description="Check current winner"
            icon={<BarChart3 size={13} />}
            onClick={() => handleMenuAction(onEvaluate)}
            title="Evaluate"
          />
          <SplitButtonMenuItem
            description="Resume traffic allocation"
            icon={<Play size={13} />}
            onClick={() => handleMenuAction(onRun)}
            title="Continue"
          />
          <SplitButtonMenuItem
            description="Stop assigning new traffic"
            icon={<Pause size={13} />}
            onClick={() => handleMenuAction(onPause)}
            title="Pause"
          />
          <SplitButtonMenuItem
            description="End this experiment"
            icon={<X size={13} />}
            onClick={() => handleMenuAction(onKill)}
            title="Kill"
          />
          <div className="border-t border-border px-2 py-1.5 font-mono text-[10px] uppercase text-muted-foreground">
            {statusLabel}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type SplitButtonMenuItemProps = {
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
};

function SplitButtonMenuItem({
  description,
  icon,
  onClick,
  title
}: SplitButtonMenuItemProps) {
  return (
    <button
      className="grid grid-cols-[auto_1fr] gap-2 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-xs font-medium">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
