import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { RawJob, RankedJob, RoleProfile, Tier } from "@/lib/types";

const RankSchema = z.object({
  rankings: z.array(
    z.object({
      job_id: z.string(),
      tier: z.enum(["land", "stretch", "leap", "skip"]),
      match_score: z.number().min(0).max(100),
      why_fit: z.string().describe("1-2 sentences. Be specific and grounded in their profile vs the job."),
      skills_to_add: z.array(z.string()).max(5).describe("Empty for 'land' tier. 2-4 concrete skills for stretch/leap."),
      suggested_path: z.string().nullable().describe("Null for 'land'. 1 sentence learning path for stretch/leap (course, project, book)."),
    })
  ),
});

export async function rankJobs(
  profile: RoleProfile,
  jobs: RawJob[]
): Promise<RankedJob[]> {
  if (jobs.length === 0) return [];

  const compact = jobs.slice(0, 60).map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    tags: j.tags,
    comp: j.comp,
    desc: j.description.slice(0, 400),
  }));

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: RankSchema,
    prompt: `You are a senior career coach matching a candidate to job listings.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOBS TO RANK (${compact.length} total):
${JSON.stringify(compact, null, 2)}

For EVERY job, output a ranking with these tiers:
- "land"    → 80-100% match, candidate could apply today and be a strong fit
- "stretch" → 60-79% match, real possibility in 3-6 months with focused skill investment
- "leap"    → 40-59% match, ambitious but achievable in 1-2 years
- "skip"    → below 40% or wrong domain/level entirely

Be honest. Most jobs in any dump are "skip". Don't pad. Aim for ~5 land, ~5 stretch, ~3 leap from this batch.

For stretch/leap, "skills_to_add" must be CONCRETE and SPECIFIC to what's actually missing — not generic words like "leadership". Example: "FSDP distributed training", "Postgres query planning", "Terraform module design".

"suggested_path" should be one practical sentence — a course, a side project to build, a book, or an open-source repo to contribute to.`,
  });

  const byId = new Map(jobs.map((j) => [j.id, j]));
  return object.rankings
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
