import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { RoleProfile } from "@/lib/types";

const ProfileSchema = z.object({
  current_title: z.string().describe("Best-guess job title for this person right now"),
  seniority: z.enum(["intern", "junior", "mid", "senior", "staff", "principal", "lead"]),
  domain: z.string().describe("Industry/domain area, e.g. 'backend infra at fintech', 'ML at biotech'"),
  skills: z.array(z.string()).min(1).max(20).describe("Concrete skills mentioned or strongly implied"),
  years_experience: z.number().nullable(),
  location_pref: z.string().nullable().describe("Country/city if mentioned, else null"),
  remote_pref: z.enum(["remote", "hybrid", "onsite", "any"]),
});

export async function extractProfile(
  paragraph: string,
  apiKey: string
): Promise<RoleProfile> {
  const client = createAnthropic({ apiKey });
  const { object } = await generateObject({
    model: client("claude-haiku-4-5-20251001"),
    schema: ProfileSchema,
    prompt: `Read this person's plain-English description of their current role and extract a structured profile.

Be precise. If they don't mention something, leave the field null or pick the "any" enum option. Infer seniority conservatively from years and described scope.

Description:
"""${paragraph}"""`,
  });
  return object as RoleProfile;
}
