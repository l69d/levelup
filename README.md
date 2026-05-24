# levelup

**Find your next role — and the one after that.**

Paste a paragraph about what you do today. levelup returns:

- **Land today** — jobs you can apply to right now
- **Stretch (3–6 months)** — jobs you can reach with a focused skill investment, plus exactly what to add
- **Leap (1–2 years)** — ambitious next-next roles with a learning path

No signup. No CV upload. Free and open source.

---

## Bring your own key

levelup runs on Claude. Click **"Add your Anthropic API key"** on the page and paste a key from [console.anthropic.com](https://console.anthropic.com/settings/keys).

- The key lives in your browser's `localStorage`
- It's sent only when you submit, forwarded directly to Anthropic
- We never store it, log it, or proxy it
- Each search costs roughly **$0.01–$0.03** on your account

That's the whole privacy model — no DB, no accounts, no telemetry.

---

## How it works

```
your paragraph
      │
      ▼
[Claude Haiku] extracts a role profile
   (skills · seniority · domain · location · remote pref)
      │
      ├─────► fetches fresh jobs from public sources
      │
      ▼
[Claude Sonnet] ranks each job into LAND / STRETCH / LEAP
      └── for stretch/leap, writes specific skills to add
          and a one-line learning path
      │
      ▼
results page
```

## Run locally

```bash
git clone https://github.com/l69d/levelup
cd levelup
npm install
npm run dev
```

Open http://localhost:3000 and paste your Anthropic key into the dialog.

> Self-hosting and want a default server key (so visitors don't need to bring their own)? Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. User-supplied keys take precedence; the server key is the fallback.

## Tech

- Next.js 16 (App Router, Server Actions, Turbopack)
- shadcn/ui + Tailwind v4
- Vercel AI SDK + Anthropic Claude (Haiku for extraction, Sonnet for ranking)
- Zod for structured outputs

## Add a job source

A source is ~30 lines. Create `lib/sources/<name>.ts`:

```ts
import type { RawJob } from "@/lib/types";

export async function fetchYourSource(): Promise<RawJob[]> {
  const res = await fetch("https://your-source/api");
  const raw = await res.json();
  return raw.map((item: any) => ({
    id: `yoursource:${item.id}`,
    source: "YourSource",
    title: item.title,
    company: item.company,
    location: item.location ?? null,
    remote: item.remote ?? false,
    url: item.url,
    description: (item.description ?? "").slice(0, 800),
    tags: item.tags ?? [],
    comp: null,
    posted_at: item.date ?? null,
  }));
}
```

Then add it to `lib/sources/index.ts`:

```ts
const results = await Promise.allSettled([
  fetchRemoteOK(),
  fetchYourSource(),   // <— here
]);
```

Open a PR. New sources are the highest-value contribution.

### Sources we'd love added

- HN "Who is hiring" monthly thread
- YC Work-at-a-Startup
- Adzuna (free API key, global coverage)
- Wellfound / AngelList
- USAJobs
- LinkedIn (read-only, via Google for Jobs RSS)
- Country-specific boards (Instahyre, Naukri, Otta, etc.)

## Roadmap

- [ ] Cache scraped jobs in Postgres + daily Vercel Cron (currently fetched on demand)
- [ ] More sources (see above)
- [ ] Optional email alerts for new matches
- [ ] Affiliate-linked courses for the "skills to add" suggestions
- [ ] Multi-language paragraph input

## License

MIT. Use it. Fork it. Ship it.
