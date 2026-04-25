import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

import type { CreateGoalFormValues } from "../types/experiment.types";

type CreateExperimentFormProps = {
  onCreate(values: CreateGoalFormValues): Promise<void>;
};

const initialValues: CreateGoalFormValues = {
  title: ""
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
    <form
      className="flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={submit}
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">Goal</span>
        <input
          className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 hover:border-foreground/20 focus:border-foreground/40"
          onChange={(event) => setValues({ ...values, title: event.target.value })}
          placeholder="Add a goal..."
          required
          value={values.title}
        />
      </label>
      <div className="flex">
        <Button
          className="h-11 w-full shrink-0 rounded-full px-4 sm:w-auto"
          disabled={isSubmitting}
          type="submit"
        >
          <Plus size={16} />
          Add goal
        </Button>
      </div>
    </form>
  );
}
