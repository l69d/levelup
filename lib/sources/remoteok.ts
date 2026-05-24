import type { RawJob } from "@/lib/types";

type RemoteOKItem = {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  apply_url?: string;
  description?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  date?: string;
};

export async function fetchRemoteOK(): Promise<RawJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as RemoteOKItem[];
  const items = raw.filter((it) => it && typeof it === "object" && it.position);
  return items.slice(0, 100).map((it) => ({
    id: `remoteok:${it.id ?? it.slug ?? it.position}`,
    source: "RemoteOK",
    title: String(it.position ?? "").trim(),
    company: String(it.company ?? "").trim(),
    location: it.location ? String(it.location) : null,
    remote: true,
    url: String(it.url ?? it.apply_url ?? "").trim(),
    description: stripHtml(String(it.description ?? "")).slice(0, 800),
    tags: Array.isArray(it.tags) ? it.tags.slice(0, 12).map(String) : [],
    comp: formatComp(it.salary_min, it.salary_max),
    posted_at: it.date ?? null,
  }));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatComp(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min || max) as number);
}
