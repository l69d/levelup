import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeHref } from "@/lib/safe-url";
import type { LevelupResult, RankedJob, Tier } from "@/lib/types";

const TIER_META: Record<Tier, { label: string; sub: string; pillClass: string }> = {
  land: {
    label: "Land today",
    sub: "Apply now — you're a strong fit",
    pillClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  stretch: {
    label: "Stretch",
    sub: "3–6 months of focused skill investment",
    pillClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  leap: {
    label: "Leap",
    sub: "1–2 years — ambitious, achievable",
    pillClass: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  },
};

export function Results({ result }: { result: LevelupResult }) {
  const grouped: Record<Tier, RankedJob[]> = {
    land: result.jobs.filter((j) => j.tier === "land"),
    stretch: result.jobs.filter((j) => j.tier === "stretch"),
    leap: result.jobs.filter((j) => j.tier === "leap"),
  };

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground border-b pb-4">
        <span>Reading you as</span>
        <Badge variant="secondary">{result.profile.current_title}</Badge>
        <Badge variant="outline">{result.profile.seniority}</Badge>
        <Badge variant="outline">{result.profile.domain}</Badge>
        <span className="ml-auto text-xs">Scanned {result.scanned_count} jobs</span>
      </div>

      {(["land", "stretch", "leap"] as Tier[]).map((tier) => (
        <TierSection key={tier} tier={tier} jobs={grouped[tier]} />
      ))}

      {result.jobs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No matches in this batch. Try rephrasing your role description with more detail
          about your skills and domain.
        </p>
      )}
    </section>
  );
}

function TierSection({ tier, jobs }: { tier: Tier; jobs: RankedJob[] }) {
  if (jobs.length === 0) return null;
  const meta = TIER_META[tier];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{meta.label}</h2>
        <span className="text-xs text-muted-foreground">{meta.sub}</span>
      </div>
      <div className="grid gap-3">
        {jobs.map((rj) => (
          <JobCard key={rj.job.id} rj={rj} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ rj }: { rj: RankedJob }) {
  const meta = TIER_META[rj.tier];
  const { job } = rj;
  const href = safeHref(job.url);
  const TitleContent = (
    <CardTitle className="text-base leading-snug">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline underline-offset-4"
        >
          {job.title}
        </a>
      ) : (
        <span>{job.title}</span>
      )}
    </CardTitle>
  );
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex-1 min-w-0">
          {TitleContent}
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
            {job.comp ? ` · ${job.comp}` : ""}
            {` · ${job.source}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-md ${meta.pillClass}`}
          >
            {meta.label} · {rj.match_score}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="text-sm flex flex-col gap-3 pt-0">
        <p className="text-foreground/90">{rj.why_fit}</p>
        {rj.skills_to_add.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Skills to add
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rj.skills_to_add.map((s) => (
                <Badge key={s} variant="secondary" className="font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {rj.suggested_path && (
          <p className="text-xs text-muted-foreground italic">
            → {rj.suggested_path}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
