import type { RawJob } from "@/lib/types";

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

type ArbeitnowResponse = { data?: ArbeitnowJob[] };

export async function fetchArbeitnow(): Promise<RawJob[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as ArbeitnowResponse;
  const jobs = data.data ?? [];

  const out: RawJob[] = [];
  for (const j of jobs.slice(0, 80)) {
    const job = toRawJob(j);
    if (job) out.push(job);
  }
  return out;
}

function toRawJob(j: ArbeitnowJob): RawJob | null {
  const title = (j.title ?? "").trim();
  const company = (j.company_name ?? "").trim();
  const slug = (j.slug ?? "").trim();
  if (!title || !company || !slug) return null;

  const url = j.url || `https://www.arbeitnow.com/view/${slug}`;
  const description = stripHtml(j.description ?? "").slice(0, 800);
  const tags = buildTags(j);

  return {
    id: `arbeitnow:${slug}`,
    source: "Arbeitnow",
    title: title.slice(0, 140),
    company: company.slice(0, 100),
    location: j.location || null,
    remote: Boolean(j.remote),
    url,
    description,
    tags,
    comp: null,
    posted_at: toIso(j.created_at),
  };
}

function buildTags(j: ArbeitnowJob): string[] {
  const out: string[] = [];
  for (const t of j.tags ?? []) out.push(String(t).toLowerCase());
  for (const t of j.job_types ?? []) out.push(String(t).toLowerCase());
  return Array.from(new Set(out)).slice(0, 10);
}

function toIso(d: number | undefined): string | null {
  if (!d) return null;
  const ms = d < 1e12 ? d * 1000 : d;
  const date = new Date(ms);
  return isNaN(date.getTime()) ? null : date.toISOString();
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
