import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createPrReviewLoop,
  renderReview,
  type DiffProvider,
  type PullRequestDiff,
  type Reviewer,
  type ReviewResult,
} from "../../loops/pr-review/index.js";

const ctx: RunContext = { repoRoot: "/tmp/repo", logger: silentLogger };

const diffOf = (paths: string[]): DiffProvider => ({
  getDiff: async (): Promise<PullRequestDiff> => ({
    files: paths.map((p) => ({ path: p, patch: `+++ ${p}` })),
  }),
});

const reviewerOf =
  (result: ReviewResult): Reviewer =>
  async () =>
    result;

describe("renderReview", () => {
  it("renders summary and issues with an advisory footer", () => {
    const md = renderReview({
      summary: "Adds search.",
      issues: [{ severity: "warning", message: "missing test", file: "src/a.ts" }],
    });
    expect(md).toContain("## 🤖 loopy automated review");
    expect(md).toContain("Adds search.");
    expect(md).toContain("`src/a.ts` missing test");
    expect(md).toContain("not a merge gate");
  });

  it("says so when nothing is flagged", () => {
    expect(renderReview({ summary: "LGTM", issues: [] })).toContain("No issues flagged.");
  });
});

describe("pr-review loop", () => {
  it("produces a comment output for a non-empty diff", async () => {
    const loop = createPrReviewLoop({}, { type: "event", events: ["pull_request"] }, {
      diff: diffOf(["src/a.ts"]),
      reviewer: reviewerOf({ summary: "fine", issues: [] }),
    });

    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("produced");
    expect(result.outputKind).toBe("comment");
    expect(result.comment).toContain("loopy automated review");
    expect(result.changes).toBeUndefined();
  });

  it("does no work on an empty diff", async () => {
    const loop = createPrReviewLoop({}, { type: "event", events: ["pull_request"] }, {
      diff: diffOf([]),
      reviewer: reviewerOf({ summary: "x", issues: [] }),
    });
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("no-work");
  });
});
