import type { RawJob } from "@/lib/types";

type HimalayasJob = {
  guid?: string;
  title?: string;
  excerpt?: string;
  description?: string;
  companyName?: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  seniority?: string[];
  locationRestrictions?: string[];
  categories?: string[];
  parentCategories?: string[];
  pubDate?: number | string;
  applicationLink?: string;
};

type HimalayasResponse = {
  jobs?: HimalayasJob[];
  limit?: number;
  offset?: number;
};

// The public API caps responses at 20 jobs per request, so paginate
// with `offset` to gather ~80 fresh listings without auth.
const PAGE_SIZE = 20;
const PAGES = 4;

export async function fetchHimalayas(): Promise<RawJob[]> {
  const offsets = Array.from({ length: PAGES }, (_, i) => i * PAGE_SIZE);
  const results = await Promise.allSettled(
    offsets.map((offset) =>
      fetch(`https://himalayas.app/jobs/api?offset=${offset}`, {
        headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
        next: { revalidate: 3600 },
      }).then(async (r) => (r.ok ? ((await r.json()) as HimalayasResponse) : null))
    )
  );

  const out: RawJob[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled" || !r.value) continue;
    for (const j of r.value.jobs ?? []) {
      const job = toRawJob(j);
      if (!job || seen.has(job.id)) continue;
      seen.add(job.id);
      out.push(job);
    }
  }
  return out.slice(0, 80);
}

function toRawJob(j: HimalayasJob): RawJob | null {
  const title = (j.title ?? "").trim();
  const company = (j.companyName ?? "").trim();
  if (!title || !company) return null;

  const slug = j.companySlug || slugify(company);
  const url = j.applicationLink
    ? j.applicationLink
    : `https://himalayas.app/companies/${slug}/jobs`;

  const description = stripHtml(j.description || j.excerpt || "").slice(0, 800);
  const tags = buildTags(j);
  const location = (j.locationRestrictions ?? []).join(", ") || null;
  const id = j.guid || `${slug}:${title}`;

  return {
    id: `himalayas:${id}`,
    source: "Himalayas",
    title: title.slice(0, 140),
    company: company.slice(0, 100),
    location,
    remote: true,
    url,
    description,
    tags,
    comp: formatComp(j.minSalary, j.maxSalary, j.currency),
    posted_at: toIso(j.pubDate),
  };
}

function toIso(d: number | string | undefined): string | null {
  if (d === undefined || d === null) return null;
  if (typeof d === "number") {
    const ms = d < 1e12 ? d * 1000 : d;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildTags(j: HimalayasJob): string[] {
  const out: string[] = [];
  for (const c of j.categories ?? []) out.push(c.toLowerCase().replace(/-/g, " "));
  for (const c of j.parentCategories ?? []) out.push(c.toLowerCase().replace(/-/g, " "));
  for (const s of j.seniority ?? []) out.push(s.toLowerCase());
  if (j.employmentType) out.push(j.employmentType.toLowerCase());
  return Array.from(new Set(out)).slice(0, 10);
}

function formatComp(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (!min && !max) return null;
  const sym = currencySymbol(currency);
  const fmt = (n: number) => `${sym}${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min || max) as number);
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
