import { DEFAULT_AI_BASE_URL } from "./client.js";

export const DEFAULT_AI_MODEL = "anthropic/claude-3.7-sonnet";

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

type Env = Record<string, string | undefined>;

/**
 * Resolve AI configuration from the environment. Defaults to OpenRouter and a
 * Claude model; returns null when no API key is set (AI loops then do not run).
 *
 * Recognized keys (first match wins for the key):
 *   OPENROUTER_API_KEY | LOOPY_AI_API_KEY | OPENAI_API_KEY
 *   LOOPY_AI_BASE_URL (default OpenRouter)
 *   LOOPY_AI_MODEL    (default anthropic/claude-3.7-sonnet)
 */
export function resolveAiConfig(env: Env = process.env): AiConfig | null {
  const apiKey =
    env["OPENROUTER_API_KEY"] ?? env["LOOPY_AI_API_KEY"] ?? env["OPENAI_API_KEY"];
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: env["LOOPY_AI_BASE_URL"] ?? DEFAULT_AI_BASE_URL,
    model: env["LOOPY_AI_MODEL"] ?? DEFAULT_AI_MODEL,
  };
}
