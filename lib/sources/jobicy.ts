import type { RawJob } from "@/lib/types";

type JobicyJob = {
  id?: number | string;
  url?: string;
  jobSlug?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
};

type JobicyResponse = { jobs?: JobicyJob[] };

export async function fetchJobicy(): Promise<RawJob[]> {
  const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=80", {
    headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as JobicyResponse;
  const jobs = data.jobs ?? [];

  const out: RawJob[] = [];
  for (const j of jobs.slice(0, 80)) {
    const job = toRawJob(j);
    if (job) out.push(job);
  }
  return out;
}

function toRawJob(j: JobicyJob): RawJob | null {
  const title = (j.jobTitle ?? "").trim();
  const company = (j.companyName ?? "").trim();
  if (!title || !company) return null;

  const id = j.id ?? j.jobSlug ?? `${company}-${title}`;
  const url = (j.url ?? "").trim();
  if (!url) return null;

  const description = stripHtml(j.jobDescription || j.jobExcerpt || "").slice(0, 800);
  const tags = buildTags(j);

  return {
    id: `jobicy:${id}`,
    source: "Jobicy",
    title: title.slice(0, 140),
    company: company.slice(0, 100),
    location: j.jobGeo || null,
    remote: true,
    url,
    description,
    tags,
    comp: formatComp(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
    posted_at: j.pubDate ?? null,
  };
}

function buildTags(j: JobicyJob): string[] {
  const out: string[] = [];
  for (const c of j.jobIndustry ?? []) out.push(c.toLowerCase());
  for (const c of j.jobType ?? []) out.push(c.toLowerCase());
  if (j.jobLevel) {
    for (const part of j.jobLevel.split(",")) {
      const t = part.trim().toLowerCase();
      if (t) out.push(t);
    }
  }
  return Array.from(new Set(out)).slice(0, 10);
}

function formatComp(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
  period: string | null | undefined
): string | null {
  if (!min && !max) return null;
  const sym = currencySymbol(currency);
  const p = (period ?? "").toLowerCase();
  const isYearly = p === "" || p === "annual" || p === "annually" || p === "yearly" || p === "year";
  const suffix = isYearly ? "" : `/${p}`;
  const fmt = (n: number) => `${sym}${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}${suffix}`;
  return `${fmt((min || max) as number)}${suffix}`;
}

function currencySymbol(code: string | null | undefined): string {
  switch ((code ?? "USD").toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return `${code} `;
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, " ")
    .trim();
}
