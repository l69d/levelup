# levelup

**Find your next role — and the one after that.**

🌐 **Live:** [levelup-one-rosy.vercel.app](https://levelup-one-rosy.vercel.app)

Paste a paragraph about what you do today. levelup returns:

- **Land today** — jobs you can apply to right now
- **Stretch (3–6 months)** — jobs you can reach with a focused skill investment, plus exactly what to add
- **Leap (1–2 years)** — ambitious next-next roles with a learning path

No signup. No CV upload. Free and open source.

---

## Bring your own key — any provider

Click **"Add your AI provider key"** on the page and pick:

| Provider | Get a key | Per search |
|---|---|---|
| **Claude** (Anthropic) | [console.anthropic.com](https://console.anthropic.com/settings/keys) | ~$0.01–0.03 |
| **GPT** (OpenAI) | [platform.openai.com](https://platform.openai.com/api-keys) | ~$0.005–0.02 |
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com/api_keys) | ~$0.001–0.005 |

- The key lives in your browser's `localStorage` (one slot per provider — swap anytime)
- It's sent only when you submit, forwarded directly to the provider
- We never store it, log it, or proxy it

That's the whole privacy model — no DB, no accounts, no telemetry.

---

## How it works

```
your paragraph
      │
      ▼
[fast model] extracts a role profile
   (skills · seniority · domain · location · remote pref)
      │
      ├─────► fetches fresh jobs from public sources
      │
      ▼
[smart model] ranks each job into LAND / STRETCH / LEAP
      └── for stretch/leap, writes specific skills to add
          and a one-line learning path
      │
      ▼
results page
```

Provider → model defaults:

| Provider | Extract (fast) | Rank (smart) |
|---|---|---|
| Claude | `claude-haiku-4-5` | `claude-sonnet-4-6` |
| OpenAI | `gpt-4o-mini` | `gpt-4o` |
| DeepSeek | `deepseek-chat` | `deepseek-chat` |

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
- Vercel AI SDK + Anthropic / OpenAI / DeepSeek providers
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

### Sources wired today

- **RemoteOK** — JSON API, ~70–100 jobs
- **HN "Who is hiring"** monthly thread — Algolia HN API, ~80 jobs
- **Remotive** — JSON API, ~20 jobs
- **WeWorkRemotely** — RSS (programming + devops/sysadmin), ~40 jobs
- **Himalayas** — JSON API, ~80 jobs (paginated, remote-only)
- **Jobicy** — JSON API, ~80 jobs (remote, global)
- **Arbeitnow** — JSON API, ~80 jobs (EU-heavy, mixed remote/on-site)

Round-robin merged so the first jobs to rank draw from every source. Roughly 400+ fresh jobs per run; the LLM ranks the top 100.

### Sources we'd love added

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
