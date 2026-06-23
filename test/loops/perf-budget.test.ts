import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import { createPerfBudgetLoop, type PerfConfig } from "../../loops/perf-budget/index.js";
import { regressions, type Measurer, type Metric } from "../../loops/perf-budget/hooks/perf.js";

function measurer(metrics: Metric[]): Measurer {
  return { current: async () => metrics };
}

function baseline(b: Record<string, number>): () => Promise<Record<string, number>> {
  return async () => b;
}

const config: PerfConfig = {
  reportPath: "reports/perf.md",
  tolerance: 0.1,
};

const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true };
const trigger = { type: "event" as const, events: ["pull_request"] };
const now = () => new Date("2026-06-23T07:00:00.000Z");
const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-perf-budget", logger: silentLogger });

describe("regressions", () => {
  it("flags a metric that exceeds its baseline beyond tolerance", () => {
    const regs = regressions([{ name: "bundle", value: 130 }], { bundle: 100 }, 0.1);
    expect(regs).toHaveLength(1);
    const r = regs[0]!;
    expect(r.name).toBe("bundle");
    expect(r.value).toBe(130);
    expect(r.baseline).toBe(100);
    expect(r.pct).toBe(30);
  });

  it("ignores a metric within tolerance", () => {
    // 105 <= 100 * 1.1, so within budget
    expect(regressions([{ name: "bundle", value: 105 }], { bundle: 100 }, 0.1)).toEqual([]);
  });

  it("ignores the exact tolerance boundary (not strictly greater)", () => {
    expect(regressions([{ name: "bundle", value: 110 }], { bundle: 100 }, 0.1)).toEqual([]);
  });

  it("ignores metrics with no baseline (new metrics are not regressions)", () => {
    expect(regressions([{ name: "brandnew", value: 9999 }], { other: 100 }, 0.1)).toEqual([]);
  });

  it("sorts results by pct descending", () => {
    const regs = regressions(
      [
        { name: "small", value: 130 }, // +30%
        { name: "big", value: 250 }, // +150%
      ],
      { small: 100, big: 100 },
      0.1,
    );
    expect(regs.map((r) => r.name)).toEqual(["big", "small"]);
  });
});

describe("perf-budget loop", () => {
  it("produces a PR writing the report when a metric is over budget", async () => {
    const loop = createPerfBudgetLoop(config, guardrails, trigger, {
      measurer: measurer([{ name: "bundle", value: 130 }]),
      readBaseline: baseline({ bundle: 100 }),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    expect(result.outputKind).toBe("pull-request");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/perf.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("2026-06-23");
    expect(contents).toContain("bundle");
    expect(result.summary).toContain("bundle");
    expect(result.summary).toContain("+30%");
    expect(result.summary).toContain("ratchet the baseline");
  });

  it("reports no work when all metrics are within budget", async () => {
    const loop = createPerfBudgetLoop(config, guardrails, trigger, {
      measurer: measurer([
        { name: "bundle", value: 105 },
        { name: "bench", value: 50 },
      ]),
      readBaseline: baseline({ bundle: 100, bench: 50 }),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
    expect(result.changes).toBeUndefined();
  });
});
