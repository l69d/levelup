import { generateObject } from "ai";
import { z } from "zod";
import type { RawJob, RankedJob, RoleProfile, Tier } from "@/lib/types";
import { getRankModel, type ProviderId } from "@/lib/providers";

const BATCH_SIZE = 20;
const MAX_JOBS = 100;

const RankingEntry = z.object({
  job_id: z.string(),
  tier: z.enum(["land", "stretch", "leap", "skip"]),
  match_score: z.number().min(0).max(100),
  why_fit: z.string().describe("1-2 sentences. Be specific and grounded in their profile vs the job."),
  skills_to_add: z.array(z.string()).max(5).describe("Empty for 'land' tier. 2-4 concrete skills for stretch/leap."),
  suggested_path: z.string().nullable().describe("Null for 'land'. 1 sentence learning path for stretch/leap (course, project, book)."),
});

const RankSchema = z.object({
  rankings: z.array(RankingEntry),
});

type CompactJob = {
  id: string;
  title: string;
  company: string;
  tags: string[];
  comp: string | null;
  desc: string;
};

export async function rankJobs(
  profile: RoleProfile,
  jobs: RawJob[],
  provider: ProviderId,
  apiKey: string
): Promise<RankedJob[]> {
  if (jobs.length === 0) return [];

  const trimmed = jobs.slice(0, MAX_JOBS);
  const batches = chunk(trimmed, BATCH_SIZE);

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const compact = batch.map(toCompact);
      const ids = compact.map((c) => c.id);

      const first = await rankBatch(profile, compact, provider, apiKey, false);
      const got = new Set(first.map((r) => r.job_id));
      const missing = ids.filter((id) => !got.has(id));

      if (missing.length === 0) return first;

      const missingBatch = batch.filter((j) => missing.includes(j.id)).map(toCompact);
      const retry = await rankBatch(profile, missingBatch, provider, apiKey, true);
      return [...first, ...retry];
    })
  );

  const flat = batchResults.flat();
  const byId = new Map(jobs.map((j) => [j.id, j]));

  return flat
    .filter((r) => r.tier !== "skip" && byId.has(r.job_id))
    .map((r) => ({
      job: byId.get(r.job_id)!,
      tier: r.tier as Tier,
      match_score: r.match_score,
      why_fit: r.why_fit,
      skills_to_add: r.skills_to_add,
      suggested_path: r.suggested_path,
    }))
    .sort((a, b) => {
      const tierOrder: Record<Tier, number> = { land: 0, stretch: 1, leap: 2 };
      if (tierOrder[a.tier] !== tierOrder[b.tier])
        return tierOrder[a.tier] - tierOrder[b.tier];
      return b.match_score - a.match_score;
    });
}

async function rankBatch(
  profile: RoleProfile,
  compact: CompactJob[],
  provider: ProviderId,
  apiKey: string,
  isRetry: boolean
): Promise<z.infer<typeof RankSchema>["rankings"]> {
  if (compact.length === 0) return [];

  const idsList = compact.map((c) => c.id).join(", ");
  const retryNote = isRetry
    ? `\nIMPORTANT (RETRY): The previous attempt skipped some of these jobs entirely. You MUST return one entry for EVERY id below, no exceptions. If a job is a bad fit, tier it "skip" — but still include it.`
    : "";

  const { object } = await generateObject({
    model: getRankModel(provider, apiKey),
    schema: RankSchema,
    prompt: `You are a senior career coach matching a candidate to job listings.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOBS TO RANK (${compact.length}):
${JSON.stringify(compact, null, 2)}

OUTPUT RULES:
1. You MUST return exactly ${compact.length} entries in "rankings" — one per job_id in the input, no omissions, no duplicates.
   Valid job_ids: ${idsList}
2. Use one of these tiers per job:
   - "land"    → 80-100% match. Candidate could apply today and be a strong fit.
   - "stretch" → 60-79% match. Real possibility in 3-6 months with focused skill investment.
   - "leap"    → 40-59% match. Ambitious but achievable in 1-2 years.
   - "skip"    → below 40%, or wrong domain/level entirely.
3. Be honest. In a typical batch many jobs will be "skip" — that is fine. Don't pad tiers, but don't be stingy either: if the candidate's profile genuinely overlaps with a role, tier it as land or stretch.
4. For stretch/leap, "skills_to_add" must be CONCRETE and SPECIFIC (e.g. "FSDP distributed training", "Postgres query planning", "Terraform module design") — not generic ("leadership", "communication").
5. "suggested_path" must be one practical sentence — a course, side project, book, or open-source repo to contribute to.${retryNote}`,
  });

  return object.rankings;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toCompact(j: RawJob): CompactJob {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    tags: j.tags,
    comp: j.comp,
    desc: j.description.slice(0, 400),
  };
}
