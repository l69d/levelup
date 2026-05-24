"use client";

import { useCallback, useEffect, useState } from "react";
import { PROVIDER_IDS, isProviderId, type ProviderId } from "@/lib/providers";

const ACTIVE_KEY = "levelup_active_provider";
const keyFor = (p: ProviderId) => `levelup_key_${p}`;
const DEFAULT_PROVIDER: ProviderId = "anthropic";

export function useApiKey() {
  const [provider, setProviderState] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [keys, setKeys] = useState<Record<ProviderId, string>>({
    anthropic: "",
    openai: "",
    deepseek: "",
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const activeRaw = window.localStorage.getItem(ACTIVE_KEY) ?? "";
      const active = isProviderId(activeRaw) ? activeRaw : DEFAULT_PROVIDER;
      const next = { ...keys };
      for (const p of PROVIDER_IDS) {
        next[p] = window.localStorage.getItem(keyFor(p)) ?? "";
      }
      setKeys(next);
      setProviderState(active);
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setProvider = useCallback((p: ProviderId) => {
    setProviderState(p);
    try {
      window.localStorage.setItem(ACTIVE_KEY, p);
    } catch {}
  }, []);

  const setKey = useCallback((p: ProviderId, value: string) => {
    setKeys((prev) => ({ ...prev, [p]: value }));
    try {
      if (value) window.localStorage.setItem(keyFor(p), value);
      else window.localStorage.removeItem(keyFor(p));
    } catch {}
  }, []);

  const clearKey = useCallback(
    (p: ProviderId) => setKey(p, ""),
    [setKey]
  );

  return {
    provider,
    apiKey: keys[provider],
    keys,
    setProvider,
    setKey,
    clearKey,
    hydrated,
  };
}

export function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 12) return "•••";
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}
