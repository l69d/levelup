"use server";

import { extractProfile } from "@/lib/extract";
import { fetchAllJobs } from "@/lib/sources";
import { rankJobs } from "@/lib/rank";
import type { LevelupResult } from "@/lib/types";

export type ActionState =
  | { ok: true; result: LevelupResult }
  | { ok: false; error: string }
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Server is missing ANTHROPIC_API_KEY. Set it in .env.local." };
  }

  try {
    const [profile, allJobs] = await Promise.all([
      extractProfile(paragraph),
      fetchAllJobs(),
    ]);
    const ranked = await rankJobs(profile, allJobs);
    return {
      ok: true,
      result: { profile, jobs: ranked, scanned_count: allJobs.length },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: `Something went wrong: ${msg}` };
  }
}
