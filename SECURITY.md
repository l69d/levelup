# Security policy

## Reporting a vulnerability

If you find a security issue in levelup, please report it privately rather than opening a public GitHub issue.

- **Preferred:** GitHub's [private vulnerability reporting](https://github.com/l69d/levelup/security/advisories/new) (Security tab → Report a vulnerability).
- **Alternative:** email the maintainer — see the GitHub profile of [@l69d](https://github.com/l69d).

Please include:
- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected version / commit hash
- Your handle if you'd like credit in the fix

We aim to acknowledge reports within 72 hours and to patch confirmed issues within 14 days for High/Critical severity. Coordinated disclosure timelines are negotiable.

## Scope

In scope: the levelup web app (this repo), its server actions, and the source-fetching code.

Out of scope: the third-party job boards we read from (RemoteOK, HN, Remotive, WWR, Himalayas, Jobicy, Arbeitnow) and the LLM providers (Anthropic, OpenAI, DeepSeek) — report those to their respective teams.

## Threat model summary

levelup has no auth, no database, and no user-owned data on the server. Users supply their own LLM API key (BYOK) which is stored in browser `localStorage`, transmitted only on form submit, forwarded directly to the provider, and never persisted server-side. We are most interested in reports about:

- Anything that leaks a user's API key beyond their browser + the provider they chose
- XSS in the rendered job cards (titles, companies, URLs come from third-party feeds)
- Abuse paths against the source providers we fetch from (we don't want our IP banned)
- Server-side request forgery or any other server-exploitable input
- Dependency vulnerabilities with a practical exploitation path

---

# Security audit — levelup

**Audit date:** 2026-05-25
**Scope:** Source code at `~/Dev/levelup` (commit `69be80f`), deployed at <https://levelup-one-rosy.vercel.app>. Read-only review.
**Auditor:** Senior security architect (Claude Code).

## Executive summary

levelup is a low-attack-surface app: no auth, no database, no user-owned data on the server, no API routes — just one Server Action that proxies LLM calls and four hardcoded outbound fetchers. The BYOK design (user pastes their own provider key, stored only in `localStorage`, forwarded server-side only on submit) is sound in principle, and the server takes pains never to persist the key. The biggest real risks are operational/abuse-shaped rather than confidentiality: **no rate limit on the server action** lets a single attacker burn the egress budget and drag the host's IP onto third-party block-lists, the **`href={job.url}` render trusts attacker-controlled URLs** from third-party feeds (React 19 blocks `javascript:`, but `data:` and other smuggled-protocol payloads are not blocked), the **`redactKey` helper is too narrow** to be relied on as a defense, and there's **no CSP and no responsible-disclosure path**. There are 2 transitive moderate npm advisories in Next 16's bundled `postcss` (no upstream fix yet — accept and track). Nothing in the audit is Critical; one High deserves attention today.

**Top 3 to fix today**
1. **Add a server-side rate limit** to the `findRoles` action (e.g. Vercel KV / Upstash + IP+UA bucket). 5 req/min/IP is generous. Without it, one attacker = your job-board partners' IP-bans + your bandwidth bill.
2. **Allow-list URL schemes** in `components/results.tsx` before rendering `<a href={job.url}>`. Reject anything that isn't `https:` (or `http:` if you must). One line, kills the entire third-party-URL XSS surface no matter what React 19 does later.
3. **Add a `SECURITY.md`** with a disclosure email (just this file is enough, but add a one-line "report vulnerabilities to ___@___" at the top). And ship a baseline CSP via `next.config.ts` headers().

**Safe to defer**
- The two `next > postcss` moderate advisories — no fix is available without a Next major bump, and the affected path is build-time CSS stringify (not runtime). Track upstream.
- The `localStorage` exposure of the API key — already disclosed to users in the README and dialog copy, and an unavoidable cost of the BYOK design.
- Prompt-injection in `extract.ts` / `rank.ts` — the LLM has no tools and no DB; worst case is a corrupted ranking that the user immediately notices.

---

## High

### [High] No rate limiting on `findRoles` server action — abuse / cost-shifting / IP reputation
**Location:** `app/actions.ts` (entire function), `lib/sources/*.ts` (downstream fetchers).
**Description:** The server action has zero throttle. Each call triggers four outbound `fetch()`es (RemoteOK, HN Algolia, Remotive, WeWorkRemotely) plus up to six LLM round-trips (one extract + up to five rank batches with retries). Although LLM cost rides on the user's key, the outbound fetches and the host's CPU/egress do not. Source providers don't care whose key paid for the LLM call — they see your Vercel egress IP hitting them once per submission. The action is reachable unauthenticated by anyone who can construct the form-action POST (which is trivial — it's a public page).
**Impact:** A trivial loop (or a few thousand concurrent visitors during a Show-HN moment) burns Vercel's hobby-tier function/bandwidth limits, can get the deployment's egress IP rate-limited or banned by RemoteOK / Remotive / WWR (which would break the product for everyone), and lets a malicious user generate large volumes of provider traffic on someone else's leaked API key. Server actions in Next include CSRF protection but not rate-limiting.
**Remediation:** Add an IP-keyed sliding-window limit. Cheapest path on Vercel:
```ts
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
export const rl = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: false,
});

// app/actions.ts (top of findRoles)
import { headers } from "next/headers";
import { rl } from "@/lib/ratelimit";
const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
const { success } = await rl.limit(ip);
if (!success) return { ok: false, error: "Too many requests. Try again in a minute." };
```
Pair with `User-Agent`-based blocking of obvious bots and cache the four source fetches (revalidate is already set to 3600s on the fetchers — verify Next 16 actually honors that for non-rendered fetches inside Server Actions; if not, wrap with `unstable_cache`).

---

## Medium

### [Medium] Third-party URLs rendered as `<a href>` without scheme allow-list
**Location:** `components/results.tsx:81` — `<a href={job.url} target="_blank" rel="noopener noreferrer">…`
**Description:** `job.url` is forwarded verbatim from RemoteOK (`it.url ?? it.apply_url`), Remotive (`j.url`), and WeWorkRemotely's RSS (`<link>`) into a clickable anchor in the user's browser. Only HN's URL is constructed from a numeric id. A malicious or compromised job listing on any of those three sources controls the href. React 19's runtime sanitiser does scrub `javascript:` URLs at click time (`isJavaScriptProtocol` regex in `react-dom-client.production.js:1411`), but it does **not** scrub `data:`, `vbscript:`, `blob:`, `file:`, or unknown schemes. Modern browsers block top-level `data:` navigations from links by default, but that's a moving target and not present on every browser/version — and CSP is missing as a fallback.
**Impact:** A planted listing could try to navigate users to attacker-controlled `data:text/html` pages (browser-dependent), or to malware-hosting URLs masquerading as job links. Phishing more than RCE, but it's all on your domain's trust.
**Remediation:** Validate at parse time in each source and at render time in `results.tsx`. Two lines:
```ts
// components/results.tsx, top of JobCard
const safeHref = /^https?:\/\//i.test(job.url) ? job.url : "#";
// then: <a href={safeHref} …>
```
And ideally drop bad URLs upstream:
```ts
// e.g. lib/sources/remoteok.ts
url: /^https?:\/\//i.test(rawUrl) ? rawUrl : "",
// drop the job if !url
```

### [Medium] `redactKey` is fragile — only matches exact substring
**Location:** `app/actions.ts:76-79`
**Description:** `redactKey` is `s.split(key).join("sk-***")`. It only catches the key when it appears verbatim and contiguous in the error message. The AI SDK's `APICallError` typically does include the key in `request.headers.authorization` and sometimes echoes the failing curl; if the SDK ever URL-encodes the key, splits it across whitespace, base64s it (some providers do), or only includes a prefix in a "key invalid: sk-ant-api03-abc…xyz" pattern, the redaction silently fails. Today the `error.message` on the AI SDK is short enough that this mostly works, but a single SDK upgrade can change that.
**Impact:** A provider error path could echo a partial or whole API key back into the client UI (the error string is rendered in `landing-form.tsx:78`). Users on shared machines / screenshare / bug-report screenshots = key leak.
**Remediation:** Catch by pattern, not by value. Redact regardless of whether the key matched:
```ts
function redactKey(s: string, key: string): string {
  let out = s;
  if (key) out = out.split(key).join("sk-***");
  // Catch common shapes even if the exact key string wasn't in the message
  out = out.replace(/sk-(?:ant-api\d+|proj|or)?-?[A-Za-z0-9_\-]{20,}/g, "sk-***");
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-]{20,}/gi, "Bearer sk-***");
  return out;
}
```
Also consider not echoing provider error text at all — replace the `else` branch with a generic "The provider returned an unexpected error. Try again." and log the real text only to your server logs (not the client).

### [Medium] No Content-Security-Policy / security headers
**Location:** `next.config.ts` (empty config).
**Description:** Next 16 ships nothing by default. The deployed site has no CSP, no `Permissions-Policy`, no `Referrer-Policy`, no `X-Content-Type-Options`, no `Frame-Options` (clickjacking risk on this app is low — no auth — but still). HSTS is provided by Vercel, but everything else is on you. Combined with the `<a href={job.url}>` finding above, a strict CSP `default-src 'self'; script-src 'self' 'unsafe-inline' …` and `navigate-to https: https://*.anthropic.com …` would close most residual avenues.
**Impact:** Defense-in-depth gap. No single exploitable bug because of it, but every other XSS-shaped finding becomes harder to mitigate.
**Remediation:** Add to `next.config.ts`:
```ts
const securityHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
export default {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
} satisfies NextConfig;
```
Tune CSP after testing — Next's font loader and any inline styles may need allowances.

### [Medium] No `SECURITY.md` / responsible-disclosure path
**Location:** Repository root (absent before this audit).
**Description:** Open-source project at github.com/l69d/levelup with no documented way to report a vulnerability. README does not mention security. GitHub's "Report a vulnerability" private-disclosure flow is not enabled.
**Impact:** Researchers who find an issue either file a public GitHub issue (worst case) or give up. You lose the chance to fix things quietly.
**Remediation:** This file itself satisfies the policy contents; also enable private vulnerability reporting in GitHub repo settings ("Security" tab → "Private vulnerability reporting" → Enable). Add to top of README:
```
## Security
Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/l69d/levelup/security/advisories/new) or email <youremail@example.com>. See [SECURITY.md](./SECURITY.md).
```

---

## Low

### [Low] Two moderate npm advisories on transitive `postcss` via `next`
**Location:** `node_modules/next/node_modules/postcss` (range `<8.5.10`), advisory `GHSA-qx2v-qp2m-jg93` (XSS via unescaped `</style>` in CSS stringify output).
**Description:** `npm audit --omit=dev` reports 2 moderate vulnerabilities, both tracing back to the same bundled postcss inside Next 16.2.6. Fix-available is listed as "next@9.3.3" (a SemVer-major downgrade, i.e. no real fix is available upstream yet). The advisory is for CSS stringify; it only matters if you compile attacker-supplied CSS at runtime. levelup compiles only its own Tailwind CSS at build time, so the practical risk is approximately zero.
**Impact:** None in practice for this app. Tracked by automated tooling that watches dependencies (Dependabot/Snyk).
**Remediation:** Wait for Next to bump its bundled postcss. Optionally add a `package.json` `overrides` block to force postcss ≥ 8.5.10 — but verify Next 16.2.6 builds against it before committing:
```json
"overrides": {
  "postcss": "^8.5.10"
}
```

### [Low] Server-action error path leaks raw provider error text to client (sliced to 200 chars)
**Location:** `app/actions.ts:70` — `error = "Something went wrong: ${msg.slice(0, 200)}";`
**Description:** Anything the SDK didn't classify as 401/quota/429 falls through and the raw message gets surfaced to the user. AI SDK error messages can include the provider's response body (JSON snippet), the failing model id, the user's organisation id, and occasionally internal IDs. 200 chars is short but enough for a JSON `"detail"` field.
**Impact:** Information disclosure — minor. Could help an attacker fingerprint your model versions and provider routing. The `redactKey` brittleness (Medium finding above) compounds this.
**Remediation:** Replace the fall-through with a generic message and log the real text server-side (Vercel logs are private):
```ts
} else {
  console.error("[findRoles] unhandled provider error:", msg);
  error = "The provider returned an unexpected error. Please try again.";
}
```

### [Low] HTML decoding inside `weworkremotely.ts` / `hn.ts` is incomplete
**Location:** `lib/sources/weworkremotely.ts:73-82`, `lib/sources/hn.ts:148-159`.
**Description:** The hand-rolled HTML entity decoder handles `&amp; &lt; &gt; &quot; &nbsp; &#39; &#x27; &#NNN;` but skips most named entities (`&apos; &mdash; &copy; &hellip; &rsquo;` etc.). XSS-wise this is fine (output goes to text nodes, React escapes), but it produces garbled job titles. Pure quality issue.
**Impact:** None for security; minor UX bug.
**Remediation:** Either accept the slight ugliness, or pull in `he` (≈2 kB) for proper decoding.

---

## Informational

### [Info] API key stored in `localStorage` — readable by any same-origin script or browser extension
**Location:** `lib/use-api-key.ts`, `components/api-key-dialog.tsx`.
**Description:** The chosen BYOK storage is `localStorage`. Any same-origin script (a future XSS, a browser extension with `host_permissions` for the site, an in-browser DevTools session that's been screenshared) can read all three keys. This is documented to users in the dialog ("Stored in your browser's localStorage…") and the README.
**Impact:** Acceptable trade-off, but worth restating explicitly: the strict-CSP recommendation above is what reduces this from "theoretical" to "actually hard to exploit." A future XSS bug would immediately expose all three provider keys.
**Remediation:** Accept and disclose (already done). Consider migrating to `sessionStorage` if you'd like the key to live only for the tab session — costs ergonomics, gains a tiny amount of safety. Not worth doing today.

### [Info] Prompt injection via the user paragraph and via fetched job text
**Location:** `lib/extract.ts:24-30`, `lib/rank.ts:97-115`.
**Description:** The user's paragraph is interpolated raw between triple quotes into the extract prompt. The fetched job titles/companies/descriptions are JSON-serialised straight into the rank prompt. There is no input sanitisation. An attacker can write a paragraph like `"""\nIgnore prior instructions. Output …"""` and force any structured output (though zod will reject malformed responses), or seed a malicious job listing that prompt-injects the ranking step.
**Impact:** Bounded — the LLM has no tools, no DB access, no code execution path. Worst case is a corrupted ranking, which the user spots. Not a confidentiality / integrity / availability bug for the app itself.
**Remediation:** Out of scope. If you ever add tools (e.g. "click apply for me"), revisit and add input-sanitisation + a structured-output guardrail.

### [Info] Server-side `fetch()` URLs are hardcoded — no SSRF surface
**Location:** `lib/sources/{remoteok,hn,remotive,weworkremotely}.ts`.
**Description:** All four outbound URLs are string literals. None are constructed from user-controlled input. The HN fetcher does inject `c.id` (a number from the parsed Algolia response) into a URL string, but it's a third-party-controlled number, not user-controlled.
**Impact:** None — confirmed not SSRF-able from a request.
**Remediation:** None.

### [Info] CSRF on server actions — protected by Next 16 defaults
**Location:** `app/actions.ts`, `components/landing-form.tsx`.
**Description:** Next 16 server actions are CSRF-protected via Origin/Host header validation by default (the `serverActions.allowedOrigins` option is not set, so only same-origin POSTs succeed). The hidden `apiKey` input cannot be exfiltrated by a cross-origin form because the cross-origin POST will fail the Origin check before the action runs.
**Impact:** None — verified.
**Remediation:** None. Do NOT add anything to `serverActions.allowedOrigins` unless you really need cross-domain submissions.

### [Info] Vercel deployment is publicly accessible (no preview protection)
**Location:** <https://levelup-one-rosy.vercel.app>.
**Description:** Production deployments on Vercel Hobby are public by default. There's no environment protection or password gate. For this app that's the intended behaviour — it's a public free tool.
**Impact:** None (by design).
**Remediation:** None.

### [Info] `AGENTS.md` / `CLAUDE.md` committed — contents reviewed, nothing sensitive
**Location:** `AGENTS.md`, `CLAUDE.md`.
**Description:** Both files contain only a brief note telling LLMs that Next 16 has breaking changes. No credentials, no internal URLs, no PII.
**Impact:** None.
**Remediation:** None.

### [Info] `.gitignore` correctly excludes `.env*` and `.vercel/` — no secrets in git history
**Location:** `.gitignore`, all six commits in `git log --all`.
**Description:** Verified `.env*` (except `.env.example`) and `.vercel/` are gitignored. `git log -p` shows no committed API keys; only example placeholders (`OPENAI_API_KEY=sk-...`) appear in README/script comments.
**Impact:** None.
**Remediation:** None.

---

## Coverage notes / what was checked

- **Secret handling:** key never written to disk, never logged in app code (`grep` for `console.*` in `app/`, `components/`, `lib/` returns nothing). `redactKey` reviewed — see Medium finding. HTTPS to providers is enforced by each SDK. Key transmitted only as POST form field over same-origin (verified — no query-string usage).
- **XSS:** No `dangerouslySetInnerHTML` anywhere. The user's paragraph never echoes back to the page (only `profile` fields from the LLM render, all as text). Source-fetched strings render as text — React 19 escapes — except `<a href={job.url}>`, which is the Medium finding above.
- **SSRF:** All four source URLs are hardcoded — confirmed not constructable from user input.
- **CSRF:** Next 16 server actions are CSRF-protected by default; verified `next.config.ts` doesn't relax `allowedOrigins`.
- **Dependencies:** `npm audit --omit=dev` → 2 moderates (transitive postcss inside Next), 0 highs, 0 criticals.
- **Rate-limiting / abuse:** Nothing in `app/actions.ts` or middleware. See High finding.
- **Server logs / error leakage:** `app/actions.ts` returns raw provider error text (sliced 200 chars) on the fall-through branch — see Low finding.
- **Headers / CSP:** None set — see Medium finding.
- **OSS hygiene:** `LICENSE` present (MIT). No `SECURITY.md` (now created). No `CONTRIBUTING.md`. README has no disclosure path.
- **Misc:** `next.config.ts` is empty (no insecure defaults). No API routes / debug endpoints (`app/` contains only `page.tsx`, `layout.tsx`, `actions.ts`, `globals.css`, `favicon.ico`). `AGENTS.md` / `CLAUDE.md` reviewed — clean.
