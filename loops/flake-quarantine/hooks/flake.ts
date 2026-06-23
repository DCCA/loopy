/**
 * Deterministic flake scoring over accumulated test-result history.
 *
 * The loop records each test's recent pass/fail outcomes in a durable
 * {@link StateStore} and scores "flakiness" purely from that history — a test
 * that flips between pass and fail without a code change is the classic flake.
 * Nothing here talks to a network or an LLM; it is all pure functions.
 */

export interface TestRun {
  id: string;
  testId: string;
  status: "pass" | "fail";
  commit?: string;
}

/** The injected boundary that supplies recent test runs (CI, a DB, etc.). */
export interface TestResultSource {
  recent(): Promise<TestRun[]>;
}

export interface FlakeScore {
  testId: string;
  observations: number;
  flips: number;
  flakeRate: number;
  allFail: boolean;
}

/** Per-test ordered run history, keyed by testId. */
export type History = Record<string, Array<{ id: string; status: "pass" | "fail" }>>;

/**
 * Merge new runs into history, de-duplicating by run id per test and keeping the
 * last `window` entries per test (chronological by appended order). Returns a
 * NEW history object; the input is never mutated.
 */
export function mergeHistory(history: History, runs: TestRun[], window: number): History {
  const merged: History = {};
  // Shallow-copy existing entries into fresh arrays so we never mutate the input.
  for (const [testId, entries] of Object.entries(history)) {
    merged[testId] = entries.map((e) => ({ id: e.id, status: e.status }));
  }

  for (const run of runs) {
    const existing = merged[run.testId] ?? [];
    if (existing.some((e) => e.id === run.id)) continue; // de-dup by run id
    existing.push({ id: run.id, status: run.status });
    merged[run.testId] = existing;
  }

  // Cap each test to the most recent `window` observations.
  for (const testId of Object.keys(merged)) {
    const entries = merged[testId];
    if (entries && entries.length > window) {
      merged[testId] = entries.slice(entries.length - window);
    }
  }

  return merged;
}

/**
 * Score every test in history. `flips` counts consecutive status changes;
 * `flakeRate` is flips / (observations - 1) when there is more than one
 * observation, else 0; `allFail` is true when every observation failed.
 */
export function scoreHistory(history: History): FlakeScore[] {
  const scores: FlakeScore[] = [];
  for (const [testId, entries] of Object.entries(history)) {
    const observations = entries.length;
    let flips = 0;
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const cur = entries[i];
      if (prev && cur && prev.status !== cur.status) flips++;
    }
    const flakeRate = observations > 1 ? flips / (observations - 1) : 0;
    const allFail = observations > 0 && entries.every((e) => e.status === "fail");
    scores.push({ testId, observations, flips, flakeRate, allFail });
  }
  return scores;
}

/**
 * Tests considered flaky: enough observations, a high-enough flake rate, and not
 * uniformly failing (an always-red test is broken, not flaky). Sorted by flake
 * rate, descending.
 */
export function flakyTests(
  scores: FlakeScore[],
  minObservations: number,
  flakeThreshold: number,
): string[] {
  return scores
    .filter(
      (s) => s.observations >= minObservations && s.flakeRate >= flakeThreshold && !s.allFail,
    )
    .sort((a, b) => b.flakeRate - a.flakeRate)
    .map((s) => s.testId);
}

/**
 * Tests that have recovered: enough observations, zero flips (consistently
 * green or stable), and not uniformly failing. These are candidates to
 * un-quarantine.
 */
export function stableTests(scores: FlakeScore[], minObservations: number): string[] {
  return scores
    .filter((s) => s.observations >= minObservations && s.flips === 0 && !s.allFail)
    .map((s) => s.testId);
}
