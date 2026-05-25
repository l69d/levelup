/**
 * Tiny in-memory sliding-window rate limit keyed by client identity.
 *
 * Limitation: on Vercel (and any horizontally-scaled serverless host),
 * each warm function instance has its own Map — an attacker who is
 * routed across N instances effectively gets N× the limit. That's still
 * a meaningful deterrent against trivial loops, and the right time to
 * graduate to Upstash Ratelimit + Redis is when the live URL gets real
 * traffic.
 *
 * Returns { ok: true } if the call is allowed, otherwise
 * { ok: false, retryAfterSec }.
 */

const buckets = new Map<string, number[]>();

const DEFAULT_LIMIT = 5; // requests
const DEFAULT_WINDOW_MS = 60_000; // per minute

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function rateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    const oldest = hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec };
  }
  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic GC so a misbehaving range of IPs can't grow the map
  // unboundedly. Cheap, runs only when the map gets large.
  if (buckets.size > 10_000) gc(now, windowMs);

  return { ok: true, remaining: limit - hits.length };
}

function gc(now: number, windowMs: number): void {
  for (const [k, arr] of buckets) {
    const alive = arr.filter((t) => now - t < windowMs);
    if (alive.length === 0) buckets.delete(k);
    else buckets.set(k, alive);
  }
}

/**
 * Best-effort client identity for a Next server action. Uses standard
 * forwarding headers Vercel sets; falls back to a constant so that
 * misconfigured environments still rate-limit (degrades to a global
 * limit instead of skipping silently).
 */
export function clientId(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "global";
}
