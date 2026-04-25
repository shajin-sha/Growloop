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
    <form className="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_1fr_180px_auto]" onSubmit={submit}>
      <input
        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        onChange={(event) => setValues({ ...values, name: event.target.value })}
        placeholder="Experiment name"
        required
        value={values.name}
      />
      <input
        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        onChange={(event) => setValues({ ...values, repoFullName: event.target.value })}
        placeholder="owner/repo"
        required
        value={values.repoFullName}
      />
      <input
        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        onChange={(event) => setValues({ ...values, conversionEvent: event.target.value })}
        placeholder="signup"
        required
        value={values.conversionEvent}
      />
      <Button disabled={isSubmitting} type="submit">
        <Plus size={16} />
        Create
      </Button>
    </form>
  );
}
