"use server";

import { extractProfile } from "@/lib/extract";
import { fetchAllJobs } from "@/lib/sources";
import { rankJobs } from "@/lib/rank";
import { isProviderId, type ProviderId } from "@/lib/providers";
import type { LevelupResult } from "@/lib/types";

export type ActionState =
  | { ok: true; result: LevelupResult }
  | { ok: false; error: string; missingKey?: boolean }
  | null;

export async function findRoles(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const paragraph = String(formData.get("paragraph") ?? "").trim();
  if (paragraph.length < 20) {
    return { ok: false, error: "Tell us a bit more — at least a sentence or two." };
  }
  if (paragraph.length > 4000) {
    return { ok: false, error: "Keep it under 4000 characters. A short paragraph is enough." };
  }

  const providerRaw = String(formData.get("provider") ?? "anthropic").trim();
  const provider: ProviderId = isProviderId(providerRaw) ? providerRaw : "anthropic";

  const userKey = String(formData.get("apiKey") ?? "").trim();
  const envFallback =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.DEEPSEEK_API_KEY;
  const apiKey = userKey || envFallback || "";

  if (!apiKey) {
    return {
      ok: false,
      error: "Add an API key to continue. It stays in your browser and is sent only when you submit.",
      missingKey: true,
    };
  }

  try {
    const [profile, allJobs] = await Promise.all([
      extractProfile(paragraph, provider, apiKey),
      fetchAllJobs(),
    ]);
    const ranked = await rankJobs(profile, allJobs, provider, apiKey);
    return {
      ok: true,
      result: { profile, jobs: ranked, scanned_count: allJobs.length },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Unknown error";
    const msg = redactKey(raw, apiKey);
    const isAuth = /401|invalid.*api.?key|authentication|unauthorized/i.test(msg);
    return {
      ok: false,
      error: isAuth
        ? "That API key was rejected by the provider. Double-check it and try again."
        : `Something went wrong: ${msg}`,
      missingKey: isAuth,
    };
  }
}

function redactKey(s: string, key: string): string {
  if (!key) return s;
  return s.split(key).join("sk-***");
}
