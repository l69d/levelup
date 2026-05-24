"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from "@/lib/providers";

export function ApiKeyDialog({
  open,
  onOpenChange,
  initialProvider,
  keys,
  onSave,
  onClear,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialProvider: ProviderId;
  keys: Record<ProviderId, string>;
  onSave: (provider: ProviderId, key: string) => void;
  onClear: (provider: ProviderId) => void;
}) {
  const [selected, setSelected] = useState<ProviderId>(initialProvider);
  const [value, setValue] = useState(keys[initialProvider]);

  useEffect(() => {
    if (open) {
      setSelected(initialProvider);
      setValue(keys[initialProvider]);
    }
  }, [open, initialProvider, keys]);

  useEffect(() => {
    setValue(keys[selected]);
  }, [selected, keys]);

  const meta = PROVIDERS[selected];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a provider</DialogTitle>
          <DialogDescription>
            levelup runs on the AI of your choice. Your key stays in your browser and is
            sent directly to the provider — never stored or proxied by us.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {PROVIDER_IDS.map((id) => {
            const m = PROVIDERS[id];
            const active = id === selected;
            const hasKey = !!keys[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`relative flex flex-col items-start gap-0.5 rounded-md border p-3 text-left text-sm transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="font-medium">{m.short}</span>
                <span
                  className={`text-[10px] leading-tight ${
                    active ? "opacity-80" : "text-muted-foreground"
                  }`}
                >
                  {m.cost.replace("~", "")}
                </span>
                {hasKey && (
                  <span
                    aria-label="key saved"
                    className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                      active ? "bg-emerald-300" : "bg-emerald-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{meta.blurb}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(selected, value.trim());
            onOpenChange(false);
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apiKeyInput" className="text-sm">
              {meta.label} API key
            </Label>
            <Input
              id="apiKeyInput"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={meta.keyHint}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get one at{" "}
              <a
                href={meta.keysUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {new URL(meta.keysUrl).host}
              </a>
              . {meta.cost}.
            </p>
          </div>

          <p className="text-xs text-muted-foreground border rounded-md p-2.5 bg-muted/50">
            Stored in your browser&apos;s localStorage. Sent only when you submit,
            forwarded directly to the provider, never logged on our servers.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            {keys[selected] && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setValue("");
                  onClear(selected);
                  onOpenChange(false);
                }}
              >
                Clear {meta.short} key
              </Button>
            )}
            <Button type="submit" disabled={!value.trim()}>
              Use {meta.short}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
