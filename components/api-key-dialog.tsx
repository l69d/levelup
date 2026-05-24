"use client";

import { useState } from "react";
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

export function ApiKeyDialog({
  open,
  onOpenChange,
  currentKey,
  onSave,
  onClear,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentKey: string;
  onSave: (k: string) => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState(currentKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Anthropic API key</DialogTitle>
          <DialogDescription>
            levelup runs on Claude. Use your own key so your data goes directly to
            Anthropic — we never store or proxy it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(value.trim());
            onOpenChange(false);
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apiKeyInput" className="text-sm">
              API key
            </Label>
            <Input
              id="apiKeyInput"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-api03-…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get one at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                console.anthropic.com
              </a>
              . Each search costs roughly $0.01–$0.03.
            </p>
          </div>

          <p className="text-xs text-muted-foreground border rounded-md p-2.5 bg-muted/50">
            Stored in your browser&apos;s localStorage. Sent only when you submit,
            forwarded directly to Anthropic, never logged on our servers.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            {currentKey && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setValue("");
                  onClear();
                  onOpenChange(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button type="submit" disabled={!value.trim()}>
              Save key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
