export type RoleProfile = {
  current_title: string;
  seniority: "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "lead";
  domain: string;
  skills: string[];
  years_experience: number | null;
  location_pref: string | null;
  remote_pref: "remote" | "hybrid" | "onsite" | "any";
};

export type RawJob = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  url: string;
  description: string;
  tags: string[];
  comp: string | null;
  posted_at: string | null;
};

export type Tier = "land" | "stretch" | "leap";

export type RankedJob = {
  job: RawJob;
  tier: Tier;
  match_score: number;
  why_fit: string;
  skills_to_add: string[];
  suggested_path: string | null;
};

export type LevelupResult = {
  profile: RoleProfile;
  jobs: RankedJob[];
  scanned_count: number;
};
