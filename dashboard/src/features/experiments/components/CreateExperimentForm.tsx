import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

import type { CreateExperimentFormValues } from "../types/experiment.types";

type CreateExperimentFormProps = {
  onCreate(values: CreateExperimentFormValues): Promise<void>;
};

const initialValues: CreateExperimentFormValues = {
  name: "",
  repoFullName: "",
  conversionEvent: "signup"
};

export function CreateExperimentForm({ onCreate }: CreateExperimentFormProps) {
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onCreate(values);
      setValues(initialValues);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4 border-b border-border bg-background p-5 lg:grid-cols-[1fr_1fr_180px_auto]" onSubmit={submit}>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Experiment</span>
        <input
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-primary"
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          placeholder="Homepage CTA"
          required
          value={values.name}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Repository</span>
        <input
          className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-primary"
          onChange={(event) => setValues({ ...values, repoFullName: event.target.value })}
          placeholder="owner/repo"
          required
          value={values.repoFullName}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Event</span>
        <input
          className="h-10 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-primary"
          onChange={(event) => setValues({ ...values, conversionEvent: event.target.value })}
          placeholder="signup"
          required
          value={values.conversionEvent}
        />
      </label>
      <div className="flex items-end">
        <Button className="h-10 w-full lg:w-auto" disabled={isSubmitting} type="submit">
          <Plus size={16} />
          Create
        </Button>
      </div>
    </form>
  );
}
