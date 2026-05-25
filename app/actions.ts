"use server";

import { headers } from "next/headers";
import { extractProfile } from "@/lib/extract";
import { fetchAllJobs } from "@/lib/sources";
import { rankJobs } from "@/lib/rank";
import { isProviderId, type ProviderId } from "@/lib/providers";
import { rateLimit, clientId } from "@/lib/rate-limit";
import type { LevelupResult } from "@/lib/types";

export type ActionState =
  | { ok: true; result: LevelupResult }
  | { ok: false; error: string; missingKey?: boolean }
  | null;

export async function findRoles(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const reqHeaders = await headers();
  const limit = rateLimit(clientId(reqHeaders));
  if (!limit.ok) {
    return {
      ok: false,
      error: `Slow down — too many requests. Try again in ${limit.retryAfterSec}s.`,
    };
  }

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
    const redacted = redact(raw, apiKey);
    console.error("[findRoles]", redacted);
    const isAuth = /401|invalid.*api.?key|authentication|unauthorized/i.test(redacted);
    const isQuota = /quota|insufficient[_ ]?(funds|credit|balance)|billing|payment[_ ]?required|exceeded/i.test(redacted);
    const isRate = /\b429\b|rate.?limit|too[_ ]?many[_ ]?requests/i.test(redacted) && !isQuota;
    let error: string;
    if (isAuth) {
      error = "That API key was rejected by the provider. Double-check it and try again.";
    } else if (isQuota) {
      const label =
        provider === "anthropic" ? "Anthropic" : provider === "openai" ? "OpenAI" : "DeepSeek";
      error = `Your ${label} account is out of credits. Top up your account, or switch providers in the key dialog.`;
    } else if (isRate) {
      error = "The provider is rate-limiting us. Wait a few seconds and try again.";
    } else {
      error =
        "Something went wrong on our side. Try again in a moment, or switch providers in the key dialog.";
    }
    return { ok: false, error, missingKey: isAuth };
  }
}

/**
 * Strip the user's API key from any string, plus scrub anything that
 * looks like a provider key in case the SDK ever echoes one we don't
 * have a literal copy of (mismatched casing, encoding, wrappers).
 */
function redact(s: string, key: string): string {
  let out = key ? s.split(key).join("[redacted]") : s;
  out = out.replace(/sk-(?:ant-api\d+|proj|or)?[-_a-zA-Z0-9]{16,}/g, "[redacted]");
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-]{16,}/gi, "Bearer [redacted]");
  return out;
}
