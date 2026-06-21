export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteInput {
  messages: ChatMessage[];
  temperature?: number;
}

/** A minimal chat-completion client. */
export interface AiClient {
  readonly model: string;
  complete(input: CompleteInput): Promise<string>;
}

export interface AiClientOptions {
  apiKey: string;
  model: string;
  /** OpenAI-compatible base URL (default OpenRouter) */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** OpenRouter ranking headers (optional) */
  referer?: string;
  title?: string;
}

export const DEFAULT_AI_BASE_URL = "https://openrouter.ai/api/v1";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Create an OpenAI-compatible chat client. Defaults to OpenRouter, but works
 * with any endpoint exposing `POST {baseUrl}/chat/completions`.
 */
export function createOpenAiCompatibleClient(opts: AiClientOptions): AiClient {
  const baseUrl = opts.baseUrl ?? DEFAULT_AI_BASE_URL;
  const doFetch = opts.fetchImpl ?? fetch;

  return {
    model: opts.model,
    async complete(input: CompleteInput): Promise<string> {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        authorization: `Bearer ${opts.apiKey}`,
      };
      if (opts.referer) headers["HTTP-Referer"] = opts.referer;
      if (opts.title) headers["X-Title"] = opts.title;

      const res = await doFetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: opts.model,
          messages: input.messages,
          temperature: input.temperature ?? 0,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI request failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("AI response contained no message content");
      }
      return content;
    },
  };
}
