import { describe, expect, it, vi } from "vitest";
import {
  createOpenAiCompatibleClient,
  resolveAiConfig,
  parseJsonResponse,
  createDocWriter,
  createReviewer,
  type AiClient,
} from "../../src/ai/index.js";

describe("resolveAiConfig", () => {
  it("defaults to OpenRouter + Claude when OPENROUTER_API_KEY is set", () => {
    const cfg = resolveAiConfig({ OPENROUTER_API_KEY: "k" });
    expect(cfg).toEqual({
      apiKey: "k",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "anthropic/claude-3.7-sonnet",
    });
  });

  it("honors overrides and alternate key names", () => {
    const cfg = resolveAiConfig({
      LOOPY_AI_API_KEY: "k2",
      LOOPY_AI_BASE_URL: "https://example/v1",
      LOOPY_AI_MODEL: "openai/gpt-4o",
    });
    expect(cfg).toEqual({ apiKey: "k2", baseUrl: "https://example/v1", model: "openai/gpt-4o" });
  });

  it("returns null without a key", () => {
    expect(resolveAiConfig({})).toBeNull();
  });
});

describe("parseJsonResponse", () => {
  it("parses bare JSON", () => {
    expect(parseJsonResponse('[{"a":1}]')).toEqual([{ a: 1 }]);
  });
  it("parses fenced JSON with surrounding prose", () => {
    const text = 'Sure!\n```json\n{"summary":"ok","issues":[]}\n```\nDone.';
    expect(parseJsonResponse(text)).toEqual({ summary: "ok", issues: [] });
  });
  it("extracts a JSON object embedded in prose", () => {
    expect(parseJsonResponse('here: {"x": [1,2]} end')).toEqual({ x: [1, 2] });
  });
});

describe("createOpenAiCompatibleClient", () => {
  it("posts to /chat/completions with a bearer token and returns content", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), { status: 200 }),
    );
    const client = createOpenAiCompatibleClient({
      apiKey: "secret",
      model: "anthropic/claude-3.7-sonnet",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.complete({ messages: [{ role: "user", content: "yo" }] });
    expect(out).toBe("hi");

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = (init as { headers: Record<string, string> }).headers;
    expect(headers["authorization"]).toBe("Bearer secret");
    const body = JSON.parse((init as { body: string }).body);
    expect(body.model).toBe("anthropic/claude-3.7-sonnet");
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 }));
    const client = createOpenAiCompatibleClient({
      apiKey: "x",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.complete({ messages: [] })).rejects.toThrow(/401/);
  });
});

describe("boundary adapters", () => {
  const clientReturning = (text: string): AiClient => ({ model: "m", complete: async () => text });

  it("createReviewer parses a ReviewResult", async () => {
    const reviewer = createReviewer(
      clientReturning('{"summary":"looks fine","issues":[{"severity":"info","message":"nit"}]}'),
    );
    const result = await reviewer({ files: [{ path: "a.ts", patch: "+x" }] });
    expect(result.summary).toBe("looks fine");
    expect(result.issues[0]?.severity).toBe("info");
  });

  it("createDocWriter returns parsed doc changes", async () => {
    const writer = createDocWriter(clientReturning('[{"path":"README.md","contents":"new"}]'));
    const changes = await writer({
      repoRoot: "/tmp/does-not-exist",
      changedSurface: [],
      docTargets: ["README.md"],
      previous: null,
      current: { version: 1, surface: [], digest: "d" },
    });
    expect(changes).toEqual([{ path: "README.md", contents: "new" }]);
  });
});
