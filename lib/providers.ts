import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";

export type ProviderId = "anthropic" | "openai" | "deepseek";

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  short: string;
  keyHint: string;
  keysUrl: string;
  cost: string;
  blurb: string;
};

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  anthropic: {
    id: "anthropic",
    label: "Claude (Anthropic)",
    short: "Claude",
    keyHint: "sk-ant-api03-…",
    keysUrl: "https://console.anthropic.com/settings/keys",
    cost: "~$0.01–0.03 per search",
    blurb: "Strongest reasoning. Best results, slightly higher cost.",
  },
  openai: {
    id: "openai",
    label: "GPT (OpenAI)",
    short: "GPT",
    keyHint: "sk-proj-… or sk-…",
    keysUrl: "https://platform.openai.com/api-keys",
    cost: "~$0.005–0.02 per search",
    blurb: "The key most people already have.",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    short: "DeepSeek",
    keyHint: "sk-…",
    keysUrl: "https://platform.deepseek.com/api_keys",
    cost: "~$0.001–0.005 per search",
    blurb: "10x cheaper than the others. Solid quality.",
  },
};

export const PROVIDER_IDS: ProviderId[] = ["anthropic", "openai", "deepseek"];

export function isProviderId(s: string): s is ProviderId {
  return (PROVIDER_IDS as string[]).includes(s);
}

export function getExtractModel(provider: ProviderId, apiKey: string): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })("claude-haiku-4-5-20251001");
    case "openai":
      return createOpenAI({ apiKey })("gpt-4o-mini");
    case "deepseek":
      return createDeepSeek({ apiKey })("deepseek-chat");
  }
}

export function getRankModel(provider: ProviderId, apiKey: string): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })("claude-sonnet-4-6");
    case "openai":
      return createOpenAI({ apiKey })("gpt-4o");
    case "deepseek":
      return createDeepSeek({ apiKey })("deepseek-chat");
  }
}
