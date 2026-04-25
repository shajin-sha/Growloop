import { Github, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CreateExperimentForm } from "./CreateExperimentForm";
import { ExperimentRow } from "./ExperimentRow";
import { useExperiments } from "../hooks/useExperiments";
import { useGitHubApp } from "../hooks/useGitHubApp";

export function ExperimentsPage() {
  const {
    create,
    error,
    evaluate,
    experiments,
    generate,
    isLoading,
    refresh,
    updateStatus
  } = useExperiments();
  const githubApp = useGitHubApp();

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Growloop</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conversion experiments, GitHub PRs, and winner calls.
            </p>
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

      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <CreateExperimentForm onCreate={create} />

          {error ? (
            <div className="p-5 text-sm text-destructive">{error}</div>
          ) : null}

          {isLoading ? (
            <div className="p-5 text-sm text-muted-foreground">Loading experiments...</div>
          ) : null}

          {!isLoading && experiments.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No experiments yet.</div>
          ) : null}

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
      </section>
    </main>
  );
}
