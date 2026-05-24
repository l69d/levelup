"use client";

import { useActionState } from "react";
import { findRoles, type ActionState } from "@/app/actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Results } from "@/components/results";

const PLACEHOLDER = `e.g. I'm a backend engineer with 3 years of experience at a fintech startup in Bangalore. Mostly Python + Django, some Postgres tuning, deployed on AWS. I've shipped one ML model to prod using sklearn. Open to remote.`;

export function LandingForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    findRoles,
    null
  );

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-4">
        <Textarea
          name="paragraph"
          placeholder={PLACEHOLDER}
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          className="text-base resize-none bg-card focus-visible:ring-2"
          disabled={pending}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Plain English. No signup. No CV upload.
          </p>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Scanning…" : "Find my next roles"}
          </Button>
        </div>
      </form>

      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.ok && <Results result={state.result} />}
    </div>
  );
}
