import { describe, expect, it, vi } from "vitest";
import { createGitHubRestClient } from "../../src/adapters/github-action/index.js";

/** Build a fake fetch that responds based on method + path. */
function fakeFetch(routes: Array<{ match: RegExp; method?: string; body: unknown }>) {
  return vi.fn(async (url: string | URL, init?: { method?: string }) => {
    const method = init?.method ?? "GET";
    const path = String(url);
    const route = routes.find(
      (r) => r.match.test(path) && (!r.method || r.method === method),
    );
    if (!route) {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify(route.body), { status: 200 });
  });
}

describe("createGitHubRestClient", () => {
  it("reports an open loop PR via the head filter", async () => {
    const fetchImpl = fakeFetch([{ match: /\/pulls\?state=open/, body: [{ number: 1 }] }]);
    const client = createGitHubRestClient({
      owner: "o",
      repo: "r",
      token: "t",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(await client.hasOpenLoopPr({ loopId: "auto-docs" })).toBe(true);

    const calledUrl = String(fetchImpl.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("head=o%3Aloopy%2Fauto-docs");
  });

  it("creates a PR through the git-data flow", async () => {
    const fetchImpl = fakeFetch([
      { match: /\/git\/ref\/heads\/main$/, method: "GET", body: { object: { sha: "basesha" } } },
      { match: /\/git\/commits\/basesha$/, method: "GET", body: { tree: { sha: "basetree" } } },
      { match: /\/git\/blobs$/, method: "POST", body: { sha: "blobsha" } },
      { match: /\/git\/trees$/, method: "POST", body: { sha: "newtree" } },
      { match: /\/git\/commits$/, method: "POST", body: { sha: "newcommit" } },
      { match: /\/git\/refs$/, method: "POST", body: {} },
      { match: /\/pulls$/, method: "POST", body: { number: 42, html_url: "https://gh/pr/42" } },
    ]);

    const client = createGitHubRestClient({
      owner: "o",
      repo: "r",
      token: "t",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const pr = await client.createPullRequest({
      branch: "loopy/auto-docs",
      baseBranch: "main",
      title: "chore(auto-docs): update",
      body: "body",
      changes: [{ path: "README.md", op: "write", contents: "hello" }],
    });

    expect(pr).toEqual({ number: 42, url: "https://gh/pr/42" });
    // blob -> tree -> commit -> ref -> pr were all issued
    const posts = fetchImpl.mock.calls
      .filter(([, init]) => (init as { method?: string } | undefined)?.method === "POST")
      .map(([url]) => String(url));
    expect(posts.some((u) => u.endsWith("/git/blobs"))).toBe(true);
    expect(posts.some((u) => u.endsWith("/git/trees"))).toBe(true);
    expect(posts.some((u) => u.endsWith("/git/commits"))).toBe(true);
    expect(posts.some((u) => u.endsWith("/git/refs"))).toBe(true);
    expect(posts.some((u) => u.endsWith("/pulls"))).toBe(true);
  });
});
