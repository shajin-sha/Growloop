import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CreateExperimentForm } from "./CreateExperimentForm";
import { ExperimentRow } from "./ExperimentRow";
import { useExperiments } from "../hooks/useExperiments";

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
          <Button onClick={refresh} variant="outline">
            <RefreshCcw size={16} />
            Refresh
          </Button>
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
