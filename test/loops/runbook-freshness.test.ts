import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createRunbookFreshnessLoop,
  staleRunbooks,
  type RunbookConfig,
} from "../../loops/runbook-freshness/index.js";
import type { Runbook, RunbookSource } from "../../loops/runbook-freshness/hooks/runbooks.js";

const NOW = "2026-06-23T00:00:00.000Z";

describe("staleRunbooks", () => {
  const runbooks: Runbook[] = [
    { path: "docs/runbooks/auth.md", lastReviewedIso: "2026-01-01T00:00:00.000Z" }, // 173 days
    { path: "docs/runbooks/fresh.md", lastReviewedIso: "2026-06-22T00:00:00.000Z" }, // 1 day
    { path: "docs/runbooks/db.md", lastReviewedIso: "2025-06-23T00:00:00.000Z" }, // 365 days
    { path: "docs/runbooks/broken.md", lastReviewedIso: "not-a-date" },
  ];

  it("returns only runbooks past the interval, sorted by daysSinceReview desc", () => {
    const stale = staleRunbooks(runbooks, NOW, 90);
    expect(stale.map((s) => s.path)).toEqual([
      "docs/runbooks/db.md",
      "docs/runbooks/auth.md",
    ]);
    expect(stale[0]?.daysSinceReview).toBe(365);
    expect(stale[1]?.daysSinceReview).toBe(173);
  });

  it("excludes fresh runbooks within the interval", () => {
    const stale = staleRunbooks(runbooks, NOW, 90);
    expect(stale.map((s) => s.path)).not.toContain("docs/runbooks/fresh.md");
  });

  it("skips entries with an unparseable date", () => {
    const stale = staleRunbooks(runbooks, NOW, 90);
    expect(stale.map((s) => s.path)).not.toContain("docs/runbooks/broken.md");
  });
});

const config: RunbookConfig = {
  reportPath: "reports/runbook-health.md",
  intervalDays: 90,
};

function source(runbooks: Runbook[]): RunbookSource {
  return {
    runbooks: async () => runbooks,
  };
}

const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-runbook", logger: silentLogger });

describe("runbook-freshness loop", () => {
  it("produces a report when a runbook is stale", async () => {
    const runbooks: Runbook[] = [
      { path: "docs/runbooks/auth.md", lastReviewedIso: "2026-01-01T00:00:00.000Z" },
      { path: "docs/runbooks/fresh.md", lastReviewedIso: "2026-06-22T00:00:00.000Z" },
    ];
    const loop = createRunbookFreshnessLoop(
      config,
      { pathAllowlist: ["reports/**"], maxFiles: 5 },
      { type: "manual" },
      { source: source(runbooks), now: () => new Date(NOW) },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/runbook-health.md");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("# Runbook health — 2026-06-23");
    expect(contents).toContain("docs/runbooks/auth.md");
    expect(contents).toContain("173");
    expect(contents).not.toContain("docs/runbooks/fresh.md");
  });

  it("reports no work when all runbooks are fresh", async () => {
    const runbooks: Runbook[] = [
      { path: "docs/runbooks/auth.md", lastReviewedIso: "2026-06-01T00:00:00.000Z" },
      { path: "docs/runbooks/db.md", lastReviewedIso: "2026-06-22T00:00:00.000Z" },
    ];
    const loop = createRunbookFreshnessLoop(
      config,
      { pathAllowlist: ["reports/**"], maxFiles: 5 },
      { type: "manual" },
      { source: source(runbooks), now: () => new Date(NOW) },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });
});
