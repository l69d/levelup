import type { RawJob } from "@/lib/types";
import { safeHref } from "@/lib/safe-url";
import { fetchRemoteOK } from "./remoteok";
import { fetchHN } from "./hn";
import { fetchRemotive } from "./remotive";
import { fetchWWR } from "./weworkremotely";
import { fetchHimalayas } from "./himalayas";
import { fetchJobicy } from "./jobicy";
import { fetchArbeitnow } from "./arbeitnow";

export async function fetchAllJobs(): Promise<RawJob[]> {
  const results = await Promise.allSettled([
    fetchRemoteOK(),
    fetchHN(),
    fetchRemotive(),
    fetchWWR(),
    fetchHimalayas(),
    fetchJobicy(),
    fetchArbeitnow(),
  ]);
  const buckets: RawJob[][] = results.map((r) =>
    r.status === "fulfilled" ? sanitizeBucket(r.value) : []
  );
  return interleaveAndDedupe(buckets);
}

function sanitizeBucket(jobs: RawJob[]): RawJob[] {
  return jobs
    .map((j) => {
      const safe = safeHref(j.url);
      return safe ? { ...j, url: safe } : null;
    })
    .filter((j): j is RawJob => j !== null);
}

/**
 * Round-robin merge so the head of the list draws from every source,
 * ensuring batched LLM ranking sees variety. Dedupe by id.
 */
function interleaveAndDedupe(buckets: RawJob[][]): RawJob[] {
  const out: RawJob[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const b of buckets) {
      const j = b[i];
      if (!j || seen.has(j.id)) continue;
      seen.add(j.id);
      out.push(j);
    }
  }
  return out;
}
