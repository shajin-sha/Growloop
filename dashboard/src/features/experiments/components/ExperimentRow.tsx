import { ArrowUpRight, Check, ChevronDown, Loader2, Pause, Play, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { GenerationStepStatus } from "../api/experimentsApi";
import type { ExperimentAction, ExperimentViewModel } from "../types/experiment.types";

export type ExperimentResolutionAction = "keep" | "stop" | "kill";

type ExperimentRowProps = {
  experiment: ExperimentViewModel;
  generationStatus?: GenerationStepStatus | null;
  rank?: "best" | "worst" | null;
  onStatus?: (id: string, status: ExperimentAction) => Promise<void>;
  // Selection mode — when set, buttons become selections instead of immediate API calls
  selection?: ExperimentResolutionAction | null;
  onSelect?: (id: string, action: ExperimentResolutionAction | null) => void;
};

function formatRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
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
  rank,
  onStatus,
  selection,
  onSelect
}: ExperimentRowProps) {
  if (experiment.isPending) {
    return <PendingExperimentCard experimentName={experiment.name} />;
  }

  const pullRequestUrl = experiment.variants.find((v) => v.pullRequestUrl)?.pullRequestUrl;
  const totalVisitors = experiment.metrics.reduce((t, m) => t + m.visitors, 0);
  const totalConversions = experiment.metrics.reduce((t, m) => t + m.conversions, 0);
  const conversionRate = totalVisitors > 0 ? totalConversions / totalVisitors : 0;
  const hasData = totalVisitors > 0;
  const createdDate = new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(new Date(experiment.createdAt));
  const canManage = ["draft", "running", "paused"].includes(experiment.status);
  const isWinner = rank === "best";
  const primaryAction = isWinner ? "completed" : experiment.status === "running" ? "paused" : "running";
  const primaryActionLabel = isWinner ? "Keep" : experiment.status === "running" ? "Stop" : "Run";
  const PrimaryActionIcon = isWinner ? Check : experiment.status === "running" ? Pause : Play;
  const runStateLabel = experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1);
  const isGenerating = (generationStatus && generationStatus.step !== "done") || (!pullRequestUrl && !generationStatus);
  const isFailed = generationStatus?.step === "failed";

  // Selection mode: buttons select an action instead of calling API immediately
  const isSelectionMode = Boolean(onSelect);
  const defaultSelectionAction: ExperimentResolutionAction = isWinner ? "keep" : "stop";

  const updateStatus = (status: ExperimentAction) => {
    if (!onStatus) return;
    void onStatus(experiment.id, status);
  };

  const handlePrimaryClick = () => {
    if (isSelectionMode && onSelect) {
      const newAction = defaultSelectionAction;
      // Toggle off if already selected with same action
      onSelect(experiment.id, selection === newAction ? null : newAction);
    } else {
      updateStatus(primaryAction);
    }
  };

  const handleKill = () => {
    if (isSelectionMode && onSelect) {
      onSelect(experiment.id, selection === "kill" ? null : "kill");
    } else {
      updateStatus("killed");
    }
  };

  // Selection badge colors
  const selectionStyle = selection === "keep"
    ? "border-emerald-400 ring-2 ring-emerald-200"
    : selection === "stop"
      ? "border-amber-400 ring-2 ring-amber-200"
      : selection === "kill"
        ? "border-red-400 ring-2 ring-red-200"
        : "";

  return (
    <article className={cn(
      "rounded-xl border bg-background p-4 transition-all",
      rank === "best" ? "border-emerald-200 bg-emerald-50/30" : rank === "worst" ? "border-red-200 bg-red-50/30" : "border-border",
      selectionStyle
    )}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug">{experiment.name}</h2>
        {canManage ? (
          <ExperimentActionSplitButton
            isSelectionMode={isSelectionMode}
            menuLabel={`More actions for ${experiment.name}`}
            onKill={handleKill}
            onPrimaryAction={handlePrimaryClick}
            primaryIcon={isSelectionMode
              ? (selection === "keep" ? <Check size={13} /> : selection === "stop" ? <Square size={13} /> : selection === "kill" ? <X size={13} /> : <PrimaryActionIcon size={13} />)
              : <PrimaryActionIcon size={13} />}
            primaryLabel={isSelectionMode
              ? (selection === "keep" ? "Keep ✓" : selection === "stop" ? "Stop ✓" : selection === "kill" ? "Kill ✓" : primaryActionLabel)
              : primaryActionLabel}
            selection={selection}
            statusLabel={runStateLabel}
          />
        ) : null}
      </div>

      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {experiment.description ?? "Codex-generated patch"}
      </p>

      {/* Generation status */}
      {isGenerating && !isFailed ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
          <Loader2 size={12} className="animate-spin" />
          <span>{generationStatus?.message ?? "Codex is generating code changes…"}</span>
        </div>
      ) : isFailed ? (
        <p className="mt-3 text-xs text-red-600">{generationStatus?.message ?? "Generation failed"}</p>
      ) : null}

      {/* Metrics */}
      {hasData ? (
        <div className="mt-4">
          <p className="font-mono text-3xl tabular-nums tracking-tight">{formatRate(conversionRate)}</p>
          <div className="mt-2 flex items-baseline gap-4 text-xs text-muted-foreground">
            <span>{formatNumber(totalVisitors)} visitors</span>
            <span>{formatNumber(totalConversions)} conversions</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
          Waiting for traffic. Drive visitors to your site to start collecting data.
        </p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{createdDate} · {runStateLabel}</span>
          {rank === "best" ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Winner</span>
          ) : rank === "worst" ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">Lowest</span>
          ) : null}
        </div>
        {pullRequestUrl ? (
          <a
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            href={pullRequestUrl}
            rel="noreferrer"
            target="_blank"
          >
            PR <ArrowUpRight size={11} />
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
    <article className="rounded-xl border border-border bg-background p-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{experimentName}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{planningSteps[stepIndex]}</p>
      <div className="mt-4 h-8 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-4">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    </article>
  );
}

type ExperimentActionSplitButtonProps = {
  isSelectionMode: boolean;
  menuLabel: string;
  onKill: () => void;
  onPrimaryAction: () => void;
  primaryIcon: ReactNode;
  primaryLabel: string;
  selection?: ExperimentResolutionAction | null;
  statusLabel: string;
};

function ExperimentActionSplitButton({
  isSelectionMode,
  menuLabel,
  onKill,
  onPrimaryAction,
  primaryIcon,
  primaryLabel,
  selection,
  statusLabel
}: ExperimentActionSplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setIsOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [isOpen]);

  const act = (fn: () => void) => { fn(); setIsOpen(false); };

  const primarySelected = selection === "keep" || selection === "stop";
  const killSelected = selection === "kill";

  const menuItems: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }[] = [
    {
      icon: <X size={12} />,
      label: isSelectionMode ? (killSelected ? "Kill ✓" : "Kill") : "Kill",
      onClick: () => act(onKill),
      active: killSelected
    }
  ];

  return (
    <div className="relative ml-auto inline-flex shrink-0 items-stretch rounded-md border border-border bg-background text-xs" ref={ref}>
      <button
        className={cn(
          "inline-flex h-7 items-center gap-1 px-2 font-medium hover:bg-muted",
          primarySelected && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        )}
        onClick={(e) => { e.stopPropagation(); onPrimaryAction(); setIsOpen(false); }}
        type="button"
      >
        {primaryIcon}{primaryLabel}
      </button>
      <button aria-expanded={isOpen} aria-label={menuLabel} className="flex h-7 w-7 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); setIsOpen((c) => !c); }} type="button">
        <ChevronDown size={13} />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-8 z-10 grid w-48 rounded-md border border-border bg-background p-1 shadow-lg">
          {menuItems.map((item) => (
            <MenuItem active={item.active} icon={item.icon} key={item.label} label={item.label} onClick={item.onClick} />
          ))}
          <div className="border-t border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">{statusLabel}</div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ icon, label, onClick, active }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      className={cn("flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted", active && "bg-red-50 text-red-700 hover:bg-red-100")}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      type="button"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
