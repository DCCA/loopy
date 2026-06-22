import { describe, expect, it, vi } from "vitest";
import { createGitHubDiffProvider } from "../../src/adapters/github-action/index.js";

describe("createGitHubDiffProvider", () => {
  it("lists PR files and maps them to { path, patch }", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            { filename: "src/a.ts", patch: "@@ -1 +1 @@" },
            { filename: "README.md" }, // no patch (e.g. binary/large)
          ]),
          { status: 200 },
        ),
    );
    const provider = createGitHubDiffProvider({
      owner: "o",
      repo: "r",
      token: "t",
      prNumber: 9,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const diff = await provider.getDiff();
    expect(diff.files).toEqual([
      { path: "src/a.ts", patch: "@@ -1 +1 @@" },
      { path: "README.md", patch: "" },
    ]);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/repos/o/r/pulls/9/files");
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    const provider = createGitHubDiffProvider({
      owner: "o",
      repo: "r",
      token: "t",
      prNumber: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.getDiff()).rejects.toThrow(/404/);
  });
});
