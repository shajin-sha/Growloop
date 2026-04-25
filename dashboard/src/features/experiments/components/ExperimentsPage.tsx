import { Activity, Beaker, Github, GitPullRequest, RefreshCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ExperimentRow } from "./ExperimentRow";
import { useExperiments } from "../hooks/useExperiments";
import { useGitHubApp } from "../hooks/useGitHubApp";

export function ExperimentsPage() {
  const {
    error,
    evaluate,
    experiments,
    generate,
    isLoading,
    refresh,
    updateStatus
  } = useExperiments();
  const githubApp = useGitHubApp();
  const runningExperiments = experiments.filter((experiment) => experiment.status === "running").length;
  const totalPullRequests = experiments.reduce(
    (total, experiment) => total + experiment.variants.filter((variant) => variant.pullRequestUrl).length,
    0
  );
  const winners = experiments.filter((experiment) => experiment.winnerVariantId).length;
  const averageConversionRate =
    experiments.length === 0
      ? 0
      : experiments.reduce((total, experiment) => {
          const rates = experiment.metrics.map((metric) => metric.conversionRate);
          const bestRate = rates.length > 0 ? Math.max(...rates) : 0;

          return total + bestRate;
        }, 0) / experiments.length;
  const stats = [
    {
      icon: Beaker,
      label: "Experiments",
      value: experiments.length.toString()
    },
    {
      icon: Activity,
      label: "Running",
      value: runningExperiments.toString()
    },
    {
      icon: GitPullRequest,
      label: "Pull requests",
      value: totalPullRequests.toString()
    },
    {
      icon: Trophy,
      label: "Winners",
      value: winners.toString()
    }
  ];

  return (
    <main className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-border bg-foreground text-background">
              <Activity size={17} />
            </div>
            <div>
              <h1 className="text-lg font-medium">Growloop</h1>
              <p className="text-sm text-muted-foreground">Experiments dashboard</p>
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

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-44 flex-col justify-between rounded-lg border border-border bg-background p-6">
            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">Conversion OS</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-medium leading-tight">
                Ship conversion experiments through GitHub with a clean winner loop.
              </h2>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
                best avg {(averageConversionRate * 100).toFixed(1)}%
              </span>
              <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
                {experiments.length} total
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
                  <p className="mt-4 font-mono text-3xl tabular-nums">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-destructive">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-border bg-background p-8 text-sm text-muted-foreground">
            Loading experiments...
          </div>
        ) : null}

        {!isLoading && experiments.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-8 text-sm text-muted-foreground">
            No experiments yet.
          </div>
        ) : null}

        {!isLoading && experiments.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {experiments.map((experiment) => (
              <ExperimentRow
                experiment={experiment}
                key={experiment.id}
                onEvaluate={evaluate}
                onGenerate={generate}
                onStatus={updateStatus}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
