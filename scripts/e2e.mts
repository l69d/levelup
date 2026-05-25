#!/usr/bin/env tsx
/**
 * End-to-end smoke test for levelup's pipeline.
 *
 * Runs with whatever provider+key are available in env:
 *   ANTHROPIC_API_KEY -> anthropic
 *   OPENAI_API_KEY    -> openai
 *   DEEPSEEK_API_KEY  -> deepseek
 *
 * Steps:
 *   1. Fetch RemoteOK jobs (no key needed)
 *   2. Extract a sample role profile via the LLM
 *   3. Rank a slice of jobs via the LLM
 *   4. Print a digest
 *
 * Usage:
 *   cd ~/Dev/levelup
 *   OPENAI_API_KEY=sk-... npx tsx scripts/e2e.mts
 */
import { fetchAllJobs } from "../lib/sources/index";
import { extractProfile } from "../lib/extract";
import { rankJobs } from "../lib/rank";
import type { ProviderId } from "../lib/providers";

const SAMPLE = `I'm a backend engineer with 3 years of experience at a fintech startup in Bangalore. Mostly Python + Django, some Postgres tuning, deployed on AWS. I've shipped one ML model to prod using sklearn. Open to remote.`;

function pickProvider(): { provider: ProviderId; apiKey: string } | null {
  if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  if (process.env.DEEPSEEK_API_KEY) return { provider: "deepseek", apiKey: process.env.DEEPSEEK_API_KEY };
  return null;
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  try {
    const r = await fn();
    console.log(`✓ ${label}  (${Date.now() - t}ms)`);
    return r;
  } catch (e) {
    console.log(`✗ ${label}  (${Date.now() - t}ms)`);
    throw e;
  }
}

(async () => {
  console.log("levelup e2e smoke test\n");

  console.log("--- 1. Source: RemoteOK ---");
  const jobs = await timed("fetchAllJobs", () => fetchAllJobs());
  console.log(`   jobs returned: ${jobs.length}`);
  if (jobs.length === 0) {
    console.log("   ⚠ source returned 0 jobs — check RemoteOK availability");
    process.exit(1);
  }
  const sample = jobs[0];
  console.log(`   sample:`);
  console.log(`     ${sample.title} @ ${sample.company} (${sample.source})`);
  console.log(`     ${sample.tags.slice(0, 6).join(", ")}`);
  console.log(`     ${sample.url}`);

  const pick = pickProvider();
  if (!pick) {
    console.log("\n--- 2/3. LLM steps SKIPPED (no API key in env) ---");
    console.log("   Set ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY to run the full pipeline.");
    process.exit(0);
  }
  console.log(`\n   using provider: ${pick.provider}`);

  console.log("\n--- 2. Extract role profile ---");
  const profile = await timed("extractProfile", () => extractProfile(SAMPLE, pick.provider, pick.apiKey));
  console.log(`   title:    ${profile.current_title}`);
  console.log(`   seniority: ${profile.seniority}`);
  console.log(`   domain:   ${profile.domain}`);
  console.log(`   skills:   ${profile.skills.slice(0, 8).join(", ")}`);
  console.log(`   remote:   ${profile.remote_pref}`);

  console.log("\n--- 3. Rank jobs ---");
  const ranked = await timed("rankJobs", () => rankJobs(profile, jobs, pick.provider, pick.apiKey));
  const land = ranked.filter((r) => r.tier === "land");
  const stretch = ranked.filter((r) => r.tier === "stretch");
  const leap = ranked.filter((r) => r.tier === "leap");
  console.log(`   land:    ${land.length}`);
  console.log(`   stretch: ${stretch.length}`);
  console.log(`   leap:    ${leap.length}`);
  console.log(`   total:   ${ranked.length} of ${jobs.length} scanned\n`);

  console.log("--- top 3 LAND ---");
  for (const r of land.slice(0, 3)) {
    console.log(`\n  ${r.match_score}% | ${r.job.title} @ ${r.job.company}`);
    console.log(`         why: ${r.why_fit}`);
  }

  console.log("\n--- top 2 STRETCH (skill gap check) ---");
  for (const r of stretch.slice(0, 2)) {
    console.log(`\n  ${r.match_score}% | ${r.job.title} @ ${r.job.company}`);
    console.log(`         why: ${r.why_fit}`);
    console.log(`         add: ${r.skills_to_add.join(", ")}`);
    if (r.suggested_path) console.log(`         path: ${r.suggested_path}`);
  }

  console.log("\n--- top 1 LEAP ---");
  for (const r of leap.slice(0, 1)) {
    console.log(`\n  ${r.match_score}% | ${r.job.title} @ ${r.job.company}`);
    console.log(`         why: ${r.why_fit}`);
    console.log(`         add: ${r.skills_to_add.join(", ")}`);
    if (r.suggested_path) console.log(`         path: ${r.suggested_path}`);
  }

  console.log("\n✓ all checks passed");
})().catch((e) => {
  console.error("\n✗ FAIL");
  console.error(e);
  process.exit(1);
});
