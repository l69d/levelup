import type { RawJob } from "@/lib/types";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags?: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
};

type RemotiveResponse = { jobs: RemotiveJob[] };

export async function fetchRemotive(): Promise<RawJob[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs?limit=100", {
    headers: { "User-Agent": "levelup-bot/0.1 (+https://github.com/l69d/levelup)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as RemotiveResponse;
  const jobs = data.jobs ?? [];

  return jobs.slice(0, 100).map((j) => ({
    id: `remotive:${j.id}`,
    source: "Remotive",
    title: (j.title ?? "").trim(),
    company: (j.company_name ?? "").trim(),
    location: j.candidate_required_location || null,
    remote: true,
    url: j.url,
    description: stripHtml(j.description ?? "").slice(0, 800),
    tags: [
      ...(j.category ? [j.category.toLowerCase()] : []),
      ...((j.tags ?? []).slice(0, 8).map((t) => t.toLowerCase())),
    ],
    comp: j.salary || null,
    posted_at: j.publication_date || null,
  }));
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
