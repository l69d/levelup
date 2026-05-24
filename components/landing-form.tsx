"use client";

import { useActionState, useEffect, useState } from "react";
import { findRoles, type ActionState } from "@/app/actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Results } from "@/components/results";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { useApiKey, maskKey } from "@/lib/use-api-key";
import { PROVIDERS } from "@/lib/providers";

const PLACEHOLDER = `e.g. I'm a backend engineer with 3 years of experience at a fintech startup in Bangalore. Mostly Python + Django, some Postgres tuning, deployed on AWS. I've shipped one ML model to prod using sklearn. Open to remote.`;

export function LandingForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    findRoles,
    null
  );
  const { provider, apiKey, keys, setProvider, setKey, clearKey, hydrated } =
    useApiKey();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (state?.ok === false && state.missingKey) setDialogOpen(true);
  }, [state]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!apiKey) {
      e.preventDefault();
      setDialogOpen(true);
    }
  };

  const meta = PROVIDERS[provider];

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex items-center justify-end -mb-2">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {hydrated && apiKey
            ? `${meta.short} · ${maskKey(apiKey)} · change`
            : "Add your AI provider key"}
        </button>
      </div>

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="provider" value={provider} />
        <input type="hidden" name="apiKey" value={apiKey} />
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

      {state?.ok === false && !state.missingKey && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.ok && <Results result={state.result} />}

      <ApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialProvider={provider}
        keys={keys}
        onSave={(p, k) => {
          setKey(p, k);
          setProvider(p);
        }}
        onClear={clearKey}
      />
    </div>
  );
}
