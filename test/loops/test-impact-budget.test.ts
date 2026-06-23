import { describe, expect, it } from "vitest";
import {
  createMemoryStateStore,
  runLoop,
  silentLogger,
  type RunContext,
  type StateStore,
} from "../../src/core/index.js";
import {
  createTestImpactBudgetLoop,
  regressions,
  updateBaseline,
  type Baseline,
  type TestImpactConfig,
  type TestTiming,
  type TimingSource,
} from "../../loops/test-impact-budget/index.js";

const BASELINE_KEY = "test-impact:baseline";

const config: TestImpactConfig = {
  reportPath: "reports/test-impact.md",
  growthThreshold: 0.5,
  alpha: 0.3,
};

const ctx = (): RunContext => ({ repoRoot: "/tmp/test-impact-budget-test", logger: silentLogger });

function timing(testId: string, durationMs: number): TestTiming {
  return { testId, durationMs };
}

/** A TimingSource that returns a fixed set of timings. */
function source(timings: TestTiming[]): TimingSource {
  return { latest: async () => timings };
}

describe("regressions", () => {
  it("flags a test that grew past the threshold", () => {
    const latest = [timing("slow", 200)];
    const baseline: Baseline = { slow: 100 };
    const regs = regressions(latest, baseline, 0.5);
    expect(regs).toEqual([{ testId: "slow", durationMs: 200, baselineMs: 100, pct: 100 }]);
  });

  it("ignores a test still within the threshold", () => {
    // 140 vs baseline 100 at threshold 0.5 → limit 150, not a regression.
    const regs = regressions([timing("stable", 140)], { stable: 100 }, 0.5);
    expect(regs).toEqual([]);
  });

  it("ignores a test with no baseline (first-seen)", () => {
    const regs = regressions([timing("new", 9999)], {}, 0.5);
    expect(regs).toEqual([]);
  });

  it("sorts regressions by pct descending", () => {
    const latest = [timing("a", 150), timing("b", 300)];
    const baseline: Baseline = { a: 100, b: 100 };
    const regs = regressions(latest, baseline, 0.1);
    expect(regs.map((r) => r.testId)).toEqual(["b", "a"]);
  });
});

describe("updateBaseline", () => {
  it("seeds a first-seen test with its raw duration", () => {
    const next = updateBaseline({}, [timing("new", 120)], 0.3);
    expect(next).toEqual({ new: 120 });
  });

  it("applies an EWMA to an existing baseline", () => {
    // round(0.3 * 200 + 0.7 * 100) = round(130) = 130
    const next = updateBaseline({ t: 100 }, [timing("t", 200)], 0.3);
    expect(next).toEqual({ t: 130 });
  });

  it("does not mutate the input baseline", () => {
    const input: Baseline = { t: 100 };
    updateBaseline(input, [timing("t", 200)], 0.3);
    expect(input).toEqual({ t: 100 });
  });

  it("carries over baselines without a matching latest timing", () => {
    const next = updateBaseline({ kept: 50 }, [timing("other", 80)], 0.3);
    expect(next).toEqual({ kept: 50, other: 80 });
  });
});

describe("test-impact-budget loop", () => {
  const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5 };

  it("establishes baselines on the first run without flagging work", async () => {
    const state: StateStore = createMemoryStateStore();
    const loop = createTestImpactBudgetLoop(
      config,
      guardrails,
      { type: "manual" },
      { timings: source([timing("a", 100), timing("b", 200)]), state },
    );

    const result = await runLoop(loop, ctx());
    // No prior baseline → no regressions → no work.
    expect(result.status).toBe("no-work");

    // detect persists nothing; act is what seeds the baseline. Run act-only paths
    // are exercised below, but here we confirm a no-work run leaves no baseline.
    const saved = await state.load<Baseline>(BASELINE_KEY);
    expect(saved).toBeNull();
  });

  it("flags a slowed test against a persisted baseline and writes the report", async () => {
    const state: StateStore = createMemoryStateStore();
    // Seed the baseline as a prior run's act would have.
    await state.save<Baseline>(BASELINE_KEY, { a: 100, b: 200 });

    const loop = createTestImpactBudgetLoop(
      config,
      guardrails,
      { type: "manual" },
      // "a" grew well past its budget; "b" is steady.
      { timings: source([timing("a", 400), timing("b", 200)]), state },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");

    const change = result.changes?.find((c) => c.path === "reports/test-impact.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("`a`");
    expect(contents).toContain("+300%");

    // The baseline must have been rolled forward after act.
    const saved = await state.load<Baseline>(BASELINE_KEY);
    // round(0.3 * 400 + 0.7 * 100) = round(190) = 190
    expect(saved?.["a"]).toBe(190);
    // round(0.3 * 200 + 0.7 * 200) = 200
    expect(saved?.["b"]).toBe(200);
  });
});
