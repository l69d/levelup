import type { RawJob } from "@/lib/types";

const FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
];

export async function fetchWWR(): Promise<RawJob[]> {
  const results = await Promise.allSettled(
    FEEDS.map((url) =>
      fetch(url, {
        headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.text() : ""))
    )
  );

  const out: RawJob[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled" || !r.value) continue;
    out.push(...parseFeed(r.value));
  }
  return out.slice(0, 80);
}

function parseFeed(xml: string): RawJob[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items
    .map(parseItem)
    .filter((j): j is RawJob => j !== null);
}

function parseItem(itemXml: string): RawJob | null {
  const title = decode(pick(itemXml, "title")).trim();
  const link = decode(pick(itemXml, "link")).trim();
  const guid = decode(pick(itemXml, "guid")).trim();
  const region = decode(pick(itemXml, "region")).trim();
  const category = decode(pick(itemXml, "category")).trim();
  const descriptionRaw = pick(itemXml, "description");
  const pubDate = pick(itemXml, "pubDate").trim();

  if (!title || !link) return null;

  const colonIdx = title.indexOf(":");
  const company = colonIdx > 0 ? title.slice(0, colonIdx).trim() : "Unknown (WWR)";
  const jobTitle = colonIdx > 0 ? title.slice(colonIdx + 1).trim() : title;

  const description = stripHtml(decode(descriptionRaw)).slice(0, 800);
  const tags = inferTags(`${jobTitle} ${description}`);

  const id = guid || link;

  return {
    id: `wwr:${id.split("/").pop() || id}`,
    source: "WeWorkRemotely",
    title: jobTitle.slice(0, 140),
    company: company.slice(0, 100),
    location: region || null,
    remote: true,
    url: link,
    description,
    tags: category ? [category.toLowerCase(), ...tags] : tags,
    comp: null,
    posted_at: pubDate ? new Date(pubDate).toISOString() : null,
  };
}

function pick(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1] : "";
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TAG_KEYWORDS = [
  "python", "typescript", "javascript", "go", "rust", "java", "kotlin",
  "ruby", "rails", "django", "react", "vue", "next.js", "node",
  "postgres", "mysql", "redis", "kafka", "aws", "gcp", "azure",
  "kubernetes", "docker", "terraform", "ml", "ai", "llm",
  "ios", "android", "devops", "sre", "platform", "security",
];

function inferTags(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const k of TAG_KEYWORDS) {
    if (lower.includes(k)) out.push(k);
    if (out.length >= 8) break;
  }
  return out;
}
