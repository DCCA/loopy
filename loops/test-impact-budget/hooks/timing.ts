/**
 * Deterministic per-test runtime tracking against a rolling baseline.
 *
 * The loop records each test's duration and compares it to an exponentially
 * weighted moving-average (EWMA) baseline kept in a durable `StateStore`. A test
 * whose latest run grows past the baseline by more than a configured threshold is
 * a regression. Nothing here talks to a network or an LLM; it is all pure
 * functions over an injected timing boundary.
 */

/** One test's measured runtime for the current run. */
export interface TestTiming {
  testId: string;
  durationMs: number;
}

/** The injected boundary that supplies the latest per-test timings (CI, a DB, etc.). */
export interface TimingSource {
  latest(): Promise<TestTiming[]>;
}

/** Per-test EWMA baseline, keyed by testId (testId → baseline ms). */
export type Baseline = Record<string, number>;

export interface Regression {
  testId: string;
  durationMs: number;
  baselineMs: number;
  pct: number;
}

/**
 * Flag NEW regressions: tests whose latest duration exceeds their stored baseline
 * by more than `growthThreshold`.
 *
 * For each test that has a baseline entry:
 * - it is a regression when `durationMs > baselineMs * (1 + growthThreshold)`
 * - `pct = round((durationMs - baselineMs) / baselineMs * 100)`
 *
 * Tests without a baseline are ignored (a first-seen test is not a regression).
 * Results are sorted by `pct` descending.
 */
export function regressions(
  latest: TestTiming[],
  baseline: Baseline,
  growthThreshold: number,
): Regression[] {
  const out: Regression[] = [];

  for (const t of latest) {
    const base = baseline[t.testId];
    if (base === undefined) continue;
    if (t.durationMs > base * (1 + growthThreshold)) {
      out.push({
        testId: t.testId,
        durationMs: t.durationMs,
        baselineMs: base,
        pct: Math.round(((t.durationMs - base) / base) * 100),
      });
    }
  }

  out.sort((a, b) => b.pct - a.pct);
  return out;
}

/**
 * Roll the baseline forward with an EWMA per test. For each latest timing:
 * - first-seen (no baseline): `new = durationMs`
 * - otherwise: `new = round(alpha * durationMs + (1 - alpha) * baselineMs)`
 *
 * Returns a NEW object; the input baseline is never mutated. Existing baseline
 * entries that have no matching latest timing are carried over unchanged.
 */
export function updateBaseline(baseline: Baseline, latest: TestTiming[], alpha: number): Baseline {
  const next: Baseline = { ...baseline };

  for (const t of latest) {
    const base = next[t.testId];
    next[t.testId] =
      base === undefined ? t.durationMs : Math.round(alpha * t.durationMs + (1 - alpha) * base);
  }

  return next;
}
