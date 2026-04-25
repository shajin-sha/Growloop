import { Activity, Beaker, Github, GitPullRequest, MoreHorizontal, RefreshCcw, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { CreateExperimentForm } from "./CreateExperimentForm";
import { ExperimentRow } from "./ExperimentRow";
import { useExperiments } from "../hooks/useExperiments";
import { useGenerationStatus } from "../hooks/useGenerationStatus";
import { useGitHubApp } from "../hooks/useGitHubApp";

export function ExperimentsPage() {
  const {
    create,
    error,
    evaluate,
    generate,
    goals,
    isLoading,
    refresh,
    removeGoal,
    updateStatus
  } = useExperiments();
  const githubApp = useGitHubApp();
  const { getExperimentStatus } = useGenerationStatus(goals.map((g) => g.id));
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!openMenuId) return;

    function handleClick(event: MouseEvent) {
      const ref = menuRefs.current[openMenuId!];
      if (ref && !ref.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const experiments = goals.flatMap((goal) => goal.experiments);
  const runningExperiments = experiments.filter((e) => e.status === "running").length;
  const totalPullRequests = experiments.reduce(
    (total, e) => total + e.variants.filter((v) => v.pullRequestUrl).length,
    0
  );
  const winners = experiments.filter((e) => e.winnerVariantId).length;
  const stats = [
    { icon: Beaker, label: "Goals", value: goals.length.toString() },
    { icon: Activity, label: "Running", value: runningExperiments.toString() },
    { icon: GitPullRequest, label: "Pull requests", value: totalPullRequests.toString() },
    { icon: Trophy, label: "Winners", value: winners.toString() }
  ];

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md border border-border bg-foreground text-background">
              <Activity size={17} />
            </div>
            <div>
              <h1 className="text-base font-medium leading-tight">Growloop</h1>
              <p className="text-xs text-muted-foreground">Goal-led conversion operations</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {githubApp?.installUrl ? (
              <Button asChild variant={githubApp.configured ? "outline" : "secondary"}>
                <a href={githubApp.installUrl} rel="noreferrer" target="_blank">
                  <Github size={16} />
                  {githubApp.configured ? "GitHub Connected" : "Install GitHub App"}
                </a>
              </Button>
            ) : null}
            <Button onClick={refresh} variant="outline">
              <RefreshCcw size={16} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="flex min-h-36 flex-col justify-between rounded-lg border border-border bg-background p-5">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-normal text-muted-foreground">
                Autonomous conversion OS
              </p>
              <h2 className="mt-2 text-2xl font-medium leading-tight tracking-tight">
                Goals drive every experiment
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add a goal, let Growloop prepare focused Codex experiments, split traffic through
                the SDK, and keep the patch that converts.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
                {runningExperiments} running
              </span>
              <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
                {experiments.length} experiments
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div className="rounded-lg border border-border bg-background p-4" key={stat.label}>
                  <div className="flex items-center justify-between gap-3 text-muted-foreground">
                    <span className="text-xs">{stat.label}</span>
                    <Icon size={15} />
                  </div>
                  <p className="mt-3 font-mono text-2xl tabular-nums">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <CreateExperimentForm onCreate={create} />

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-destructive">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-border bg-background p-8 text-sm text-muted-foreground">
            Loading goals...
          </div>
        ) : null}

        {!isLoading && goals.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-8 text-center text-sm text-muted-foreground">
            No goals yet. Add one above to get started.
          </div>
        ) : null}

        {!isLoading && goals.length > 0 ? (
          <section className="grid gap-5">
            {goals.map((goal) => (
              <section className="grid gap-3" key={goal.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-medium tracking-tight">{goal.title}</h2>
                  </div>
                  <div
                    className="relative"
                    ref={(el) => { menuRefs.current[goal.id] = el; }}
                  >
                    <Button
                      aria-label={`Manage ${goal.title}`}
                      onClick={() => setOpenMenuId(openMenuId === goal.id ? null : goal.id)}
                      size="icon"
                      variant="outline"
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                    {openMenuId === goal.id && (
                      <div className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-md border border-border bg-background py-1 shadow-md">
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                          onClick={() => {
                            setOpenMenuId(null);
                            void removeGoal(goal.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                  {goal.experiments.map((experiment) => (
                    <ExperimentRow
                      experiment={experiment}
                      generationStatus={getExperimentStatus(goal.id, experiment.id)}
                      goalTitle={goal.title}
                      key={experiment.id}
                      onEvaluate={evaluate}
                      onGenerate={generate}
                      onStatus={updateStatus}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
