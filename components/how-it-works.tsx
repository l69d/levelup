import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    n: "1",
    title: "Paste your role",
    body: "One paragraph in plain English. What you do, what you use, how long. No CV upload, no forms.",
  },
  {
    n: "2",
    title: "AI reads your skills",
    body: "A fast model extracts your title, seniority, domain, stack, and remote preference into a structured profile.",
  },
  {
    n: "3",
    title: "Scan 450+ fresh jobs",
    body: "We pull from 7 public job boards in parallel — RemoteOK, HN Who-is-hiring, Remotive, WeWorkRemotely, Himalayas, Jobicy, Arbeitnow.",
  },
  {
    n: "4",
    title: "Get 3 tiers back",
    body: "A smarter model ranks each job and groups them: LAND today, STRETCH (3–6 mo + skills to add), LEAP (1–2 yr + learning path).",
  },
];

const FLOW = `your paragraph
      │
      ▼
┌───────────────────────────────────────────────────────────────┐
│  fast model extracts a role profile                           │
│  skills · seniority · domain · location · remote pref         │
└───────────────────────────────────────────────────────────────┘
      │
      ├─────►  scrape ~450 fresh jobs from 7 public boards
      │        round-robin merged for variety
      │
      ▼
┌───────────────────────────────────────────────────────────────┐
│  smart model ranks every job into 3 tiers                     │
│                                                               │
│   LAND today          STRETCH 3–6 mo        LEAP 1–2 yr       │
│   apply now           +skills to add        +learning path    │
│                       +course / project     +course / project │
└───────────────────────────────────────────────────────────────┘
      │
      ▼
 results — apply now, or invest in the next rung up`;

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works"
      className="flex flex-col gap-8 pt-4"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="how-it-works"
          className="text-2xl sm:text-3xl font-semibold tracking-tight"
        >
          How it works
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Four steps from paragraph to ranked next moves. No accounts, no
          tracking, no database — your API key stays in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((s) => (
          <Card key={s.n} className="overflow-hidden">
            <CardContent className="flex flex-col gap-2 pt-5">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                STEP {s.n}
              </span>
              <h3 className="text-base font-semibold leading-snug">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 overflow-x-auto">
        <pre className="text-[11px] sm:text-xs leading-relaxed font-mono text-foreground/80 whitespace-pre min-w-fit">
{FLOW}
        </pre>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <PrivacyTile
          title="Your key, your browser"
          body="API keys live in localStorage and are sent only when you submit — forwarded to the provider, never stored or proxied."
        />
        <PrivacyTile
          title="No signup, no database"
          body="There are no accounts. No paragraph or result is persisted on our servers. Each search is stateless."
        />
        <PrivacyTile
          title="Open source"
          body="MIT-licensed on GitHub. Run it yourself, audit the code, or contribute a new job source — guide in the README."
        />
      </div>
    </section>
  );
}

function PrivacyTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-emerald-500/60 pl-3 py-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
