import { describe, expect, it, vi } from "vitest";
import type { RunResult } from "../../src/core/index.js";
import {
  publishRunResult,
  type CreatePrInput,
  type GitHubClient,
} from "../../src/adapters/github-action/index.js";

const produced: RunResult = {
  loopId: "auto-docs",
  status: "produced",
  summary: "did the thing",
  changes: [{ path: "README.md", op: "write", contents: "hi" }],
};

function client(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    hasOpenLoopPr: vi.fn(async () => false),
    createPullRequest: vi.fn(async () => ({ number: 7, url: "https://example/pr/7" })),
    postComment: vi.fn(async () => ({ url: "https://example/pr/7#comment" })),
    ...overrides,
  };
}

describe("publishRunResult", () => {
  it("opens a PR for a produced result", async () => {
    const c = client();
    const result = await publishRunResult(produced, c, { baseBranch: "main" });
    expect(result).toEqual({ status: "published", pr: { number: 7, url: "https://example/pr/7" } });

    const input = vi.mocked(c.createPullRequest).mock.calls[0]?.[0] as CreatePrInput;
    expect(input.branch).toBe("loopy/auto-docs");
    expect(input.baseBranch).toBe("main");
    expect(input.body).toContain("did the thing");
  });

  it("skips when an open loop PR already exists", async () => {
    const c = client({ hasOpenLoopPr: vi.fn(async () => true) });
    const result = await publishRunResult(produced, c, { guardrails: { skipIfOpenPr: true } });
    expect(result.status).toBe("skipped");
    expect(c.createPullRequest).not.toHaveBeenCalled();
  });

  it("does not skip when skipIfOpenPr is disabled", async () => {
    const c = client({ hasOpenLoopPr: vi.fn(async () => true) });
    const result = await publishRunResult(produced, c, { guardrails: { skipIfOpenPr: false } });
    expect(result.status).toBe("published");
  });

  it("is a no-op for non-produced results", async () => {
    const c = client();
    const result = await publishRunResult(
      { loopId: "auto-docs", status: "no-work" },
      c,
    );
    expect(result.status).toBe("no-op");
    expect(c.createPullRequest).not.toHaveBeenCalled();
  });

  it("posts a comment for comment-output results", async () => {
    const c = client();
    const result = await publishRunResult(
      {
        loopId: "pr-review",
        status: "produced",
        outputKind: "comment",
        comment: "Looks good, two notes inside.",
        summary: "",
      },
      c,
      { prNumber: 12 },
    );
    expect(result).toEqual({ status: "commented", comment: { url: "https://example/pr/7#comment" } });
    expect(c.createPullRequest).not.toHaveBeenCalled();
    const input = vi.mocked(c.postComment).mock.calls[0]?.[0];
    expect(input).toEqual({ issueNumber: 12, body: "Looks good, two notes inside." });
  });

  it("is a no-op for comment output with no target PR number", async () => {
    const c = client();
    const result = await publishRunResult(
      { loopId: "pr-review", status: "produced", outputKind: "comment", comment: "hi", summary: "" },
      c,
    );
    expect(result.status).toBe("no-op");
    expect(c.postComment).not.toHaveBeenCalled();
  });
});
