import type { RawJob } from "@/lib/types";
import { fetchRemoteOK } from "./remoteok";

export async function fetchAllJobs(): Promise<RawJob[]> {
  const results = await Promise.allSettled([fetchRemoteOK()]);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
