"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "levelup_anthropic_key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v) setApiKeyState(v);
    } catch {}
    setHydrated(true);
  }, []);

  const setApiKey = useCallback((next: string) => {
    setApiKeyState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const clear = useCallback(() => setApiKey(""), [setApiKey]);

  return { apiKey, setApiKey, clear, hydrated };
}

export function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 12) return "•••";
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}
