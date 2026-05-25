import type { RawJob } from "@/lib/types";

type AlgoliaSearchHit = {
  objectID: string;
  created_at_i: number;
  title: string;
};

type AlgoliaItem = {
  id: number;
  text: string | null;
  author: string | null;
  created_at_i: number;
  children?: AlgoliaItem[];
};

const SEARCH_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5";

export async function fetchHN(): Promise<RawJob[]> {
  const search = await fetch(SEARCH_URL, {
    headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
    next: { revalidate: 3600 },
  });
  if (!search.ok) return [];
  const searchData = (await search.json()) as { hits: AlgoliaSearchHit[] };
  const latest = searchData.hits.find((h) => /Who is hiring\?/i.test(h.title));
  if (!latest) return [];

  const thread = await fetch(`https://hn.algolia.com/api/v1/items/${latest.objectID}`, {
    headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
    next: { revalidate: 3600 },
  });
  if (!thread.ok) return [];
  const threadData = (await thread.json()) as AlgoliaItem;
  const children = (threadData.children ?? []).filter(
    (c) => c.text && c.text.trim().length > 80
  );

  return children
    .slice(0, 80)
    .map((c) => commentToJob(c, threadData.id))
    .filter((j): j is RawJob => j !== null);
}

function commentToJob(c: AlgoliaItem, threadId: number): RawJob | null {
  if (!c.text) return null;
  const text = stripHtml(c.text).trim();
  if (!text) return null;

  const firstLine = text.split(/\n|\.\s/)[0].slice(0, 220);
  const { title, company, location } = parseHeader(firstLine);

  if (!company && !title) return null;

  const remote = /\b(remote|fully remote|wfh)\b/i.test(text);
  const tags = inferTags(text);
  const comp = inferComp(text);

  return {
    id: `hn:${c.id}`,
    source: "HN Hiring",
    title: title || "Engineering role",
    company: company || "Unknown (HN)",
    location: location || null,
    remote,
    url: `https://news.ycombinator.com/item?id=${c.id}#${threadId}`,
    description: text.slice(0, 800),
    tags,
    comp,
    posted_at: new Date(c.created_at_i * 1000).toISOString(),
  };
}

const HEADER_SEPARATORS = /\s+[|\-–—•·]\s+/;

function parseHeader(line: string): {
  title: string | null;
  company: string | null;
  location: string | null;
} {
  const parts = line.split(HEADER_SEPARATORS).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { title: null, company: null, location: null };

  // If parts[0] looks like a location and parts[1] doesn't, the comment
  // started "City, Country | Company | ..." — swap so company comes first.
  if (parts.length >= 2 && LOCATION_HINTS.test(parts[0]) && !LOCATION_HINTS.test(parts[1])) {
    [parts[0], parts[1]] = [parts[1], parts[0]];
  }

  const company = parts[0] || null;
  const title = findTitle(parts) || null;
  const location = findLocation(parts) || null;
  return { title, company, location };
}

const TITLE_HINTS = /\b(engineer|developer|scientist|architect|designer|manager|lead|ops|sre|analyst|founder|cto|head of|director|intern|product|researcher)\b/i;
function findTitle(parts: string[]): string | null {
  for (let i = 1; i < parts.length; i++) {
    if (TITLE_HINTS.test(parts[i])) return parts[i].slice(0, 100);
  }
  return parts[1] ?? null;
}

const LOCATION_HINTS = /\b(remote|onsite|hybrid|san francisco|new york|nyc|london|berlin|bangalore|bengaluru|mumbai|delhi|singapore|toronto|seattle|austin|usa|uk|eu|emea|americas|apac)\b/i;
function findLocation(parts: string[]): string | null {
  for (const p of parts) {
    if (LOCATION_HINTS.test(p)) return p.slice(0, 80);
  }
  return null;
}

const TAG_KEYWORDS = [
  "python", "typescript", "javascript", "go", "rust", "java", "kotlin", "swift",
  "ruby", "rails", "django", "react", "vue", "svelte", "next.js", "node",
  "postgres", "mysql", "redis", "kafka", "spark", "airflow",
  "aws", "gcp", "azure", "kubernetes", "docker", "terraform",
  "ml", "machine learning", "ai", "llm", "nlp", "pytorch", "tensorflow",
  "data", "analytics", "etl", "elixir", "scala", "haskell",
  "ios", "android", "flutter", "react native",
  "blockchain", "solidity", "defi",
  "devops", "sre", "infra", "platform", "security", "cryptography",
];

function inferTags(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const k of TAG_KEYWORDS) {
    if (lower.includes(k)) out.push(k);
    if (out.length >= 10) break;
  }
  return out;
}

const COMP_PATTERNS = [
  /\$\s?\d{2,3}[Kk](?:\s?[-–to]+\s?\$?\s?\d{2,3}[Kk])?/,
  /€\s?\d{2,3}[Kk](?:\s?[-–to]+\s?€?\s?\d{2,3}[Kk])?/,
  /£\s?\d{2,3}[Kk](?:\s?[-–to]+\s?£?\s?\d{2,3}[Kk])?/,
];
function inferComp(text: string): string | null {
  for (const r of COMP_PATTERNS) {
    const m = text.match(r);
    if (m) return m[0].slice(0, 60);
  }
  return null;
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
