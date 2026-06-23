import { describe, expect, it } from "vitest";
import {
  createMemoryStateStore,
  runLoop,
  silentLogger,
  type RunContext,
  type StateStore,
} from "../../src/core/index.js";
import {
  createFlakeQuarantineLoop,
  flakyTests,
  mergeHistory,
  scoreHistory,
  stableTests,
  type FlakeConfig,
  type History,
  type TestResultSource,
  type TestRun,
} from "../../loops/flake-quarantine/index.js";

const HISTORY_KEY = "flake-quarantine:history";

const config: FlakeConfig = {
  quarantinePath: "quarantine.json",
  reportPath: "reports/flaky-tests.md",
  window: 20,
  minObservations: 5,
  flakeThreshold: 0.2,
};

const ctx = (): RunContext => ({ repoRoot: "/tmp/flake-quarantine-test", logger: silentLogger });

function run(testId: string, status: "pass" | "fail", id: string): TestRun {
  return { id, testId, status };
}

/** Build a per-test run series, ids derived from index. */
function series(testId: string, statuses: Array<"pass" | "fail">): TestRun[] {
  return statuses.map((status, i) => run(testId, status, `${testId}-${i}`));
}

function source(runs: TestRun[]): TestResultSource {
  return { recent: async () => runs };
}

describe("mergeHistory", () => {
  it("appends new runs keyed by test id", () => {
    const merged = mergeHistory({}, series("a", ["pass", "fail"]), 20);
    expect(merged["a"]?.map((e) => e.status)).toEqual(["pass", "fail"]);
  });

  it("de-duplicates by run id", () => {
    const base = mergeHistory({}, [run("a", "pass", "r1")], 20);
    const merged = mergeHistory(base, [run("a", "fail", "r1"), run("a", "fail", "r2")], 20);
    // r1 already present (keeps original "pass"); only r2 appended.
    expect(merged["a"]?.map((e) => e.status)).toEqual(["pass", "fail"]);
    expect(merged["a"]?.map((e) => e.id)).toEqual(["r1", "r2"]);
  });

  it("caps each test to the window, keeping the most recent", () => {
    const merged = mergeHistory({}, series("a", ["pass", "fail", "pass", "fail"]), 2);
    expect(merged["a"]?.map((e) => e.id)).toEqual(["a-2", "a-3"]);
  });

  it("does not mutate the input history", () => {
    const input: History = { a: [{ id: "a-0", status: "pass" }] };
    mergeHistory(input, [run("a", "fail", "a-1")], 20);
    expect(input["a"]).toHaveLength(1);
  });
});

describe("scoreHistory", () => {
  it("counts flips and computes flake rate", () => {
    const history = mergeHistory({}, series("a", ["pass", "fail", "pass", "fail"]), 20);
    const [score] = scoreHistory(history);
    expect(score?.observations).toBe(4);
    expect(score?.flips).toBe(3);
    expect(score?.flakeRate).toBeCloseTo(1);
    expect(score?.allFail).toBe(false);
  });

  it("marks an always-failing test as allFail with zero flips", () => {
    const history = mergeHistory({}, series("a", ["fail", "fail", "fail"]), 20);
    const [score] = scoreHistory(history);
    expect(score?.flips).toBe(0);
    expect(score?.flakeRate).toBe(0);
    expect(score?.allFail).toBe(true);
  });

  it("yields flakeRate 0 for a single observation", () => {
    const history = mergeHistory({}, series("a", ["fail"]), 20);
    const [score] = scoreHistory(history);
    expect(score?.flakeRate).toBe(0);
  });
});

describe("flakyTests", () => {
  it("flags a flapping test", () => {
    const scores = scoreHistory(
      mergeHistory({}, series("a", ["pass", "fail", "pass", "fail", "pass"]), 20),
    );
    expect(flakyTests(scores, 5, 0.2)).toEqual(["a"]);
  });

  it("does NOT flag an all-fail test", () => {
    const scores = scoreHistory(mergeHistory({}, series("a", ["fail", "fail", "fail", "fail", "fail"]), 20));
    expect(flakyTests(scores, 5, 0.2)).toEqual([]);
  });

  it("does not flag a stable (all-pass) test", () => {
    const scores = scoreHistory(mergeHistory({}, series("a", ["pass", "pass", "pass", "pass", "pass"]), 20));
    expect(flakyTests(scores, 5, 0.2)).toEqual([]);
  });

  it("does not flag a test below minObservations", () => {
    const scores = scoreHistory(mergeHistory({}, series("a", ["pass", "fail"]), 20));
    expect(flakyTests(scores, 5, 0.2)).toEqual([]);
  });

  it("sorts by flake rate descending", () => {
    let history = mergeHistory({}, series("hot", ["pass", "fail", "pass", "fail", "pass"]), 20);
    history = mergeHistory(history, series("warm", ["pass", "pass", "fail", "pass", "pass"]), 20);
    const flaky = flakyTests(scoreHistory(history), 5, 0.2);
    expect(flaky).toEqual(["hot", "warm"]);
  });
});

describe("stableTests", () => {
  it("flags an all-pass test as recovered", () => {
    const scores = scoreHistory(mergeHistory({}, series("a", ["pass", "pass", "pass", "pass", "pass"]), 20));
    expect(stableTests(scores, 5)).toEqual(["a"]);
  });

  it("does not flag an all-fail test as recovered", () => {
    const scores = scoreHistory(mergeHistory({}, series("a", ["fail", "fail", "fail", "fail", "fail"]), 20));
    expect(stableTests(scores, 5)).toEqual([]);
  });

  it("does not flag a flapping test as recovered", () => {
    const scores = scoreHistory(mergeHistory({}, series("a", ["pass", "fail", "pass", "fail", "pass"]), 20));
    expect(stableTests(scores, 5)).toEqual([]);
  });
});

describe("flake-quarantine loop", () => {
  it("quarantines a flapping test and saves merged history", async () => {
    const state: StateStore = createMemoryStateStore();
    const runs = series("flapper", ["pass", "fail", "pass", "fail", "pass"]);
    const loop = createFlakeQuarantineLoop(
      config,
      { pathAllowlist: ["quarantine.json", "reports/**"], maxFiles: 5 },
      { type: "manual" },
      { results: source(runs), state, readQuarantine: async () => [] },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");

    const quarantineChange = result.changes?.find((c) => c.path === "quarantine.json");
    expect(quarantineChange?.op).toBe("write");
    const list = JSON.parse(
      quarantineChange && quarantineChange.op === "write" ? quarantineChange.contents : "[]",
    );
    expect(list).toContain("flapper");
    expect(result.changes?.some((c) => c.path === "reports/flaky-tests.md")).toBe(true);

    // The merged history must have been persisted after act.
    const saved = await state.load<History>(HISTORY_KEY);
    expect(saved?.["flapper"]).toHaveLength(5);
  });

  it("un-quarantines a recovered, already-quarantined test", async () => {
    const state: StateStore = createMemoryStateStore();
    const runs = series("recovered", ["pass", "pass", "pass", "pass", "pass"]);
    const loop = createFlakeQuarantineLoop(
      config,
      { pathAllowlist: ["quarantine.json", "reports/**"], maxFiles: 5 },
      { type: "manual" },
      { results: source(runs), state, readQuarantine: async () => ["recovered"] },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.find((c) => c.path === "quarantine.json");
    const list = JSON.parse(change && change.op === "write" ? change.contents : "[]");
    expect(list).not.toContain("recovered");
    expect(result.summary).toContain("recovered");
  });

  it("reports no work when nothing is actionable", async () => {
    const state: StateStore = createMemoryStateStore();
    const runs = series("steady", ["pass", "pass", "pass", "pass", "pass"]);
    const loop = createFlakeQuarantineLoop(
      config,
      { pathAllowlist: ["quarantine.json", "reports/**"], maxFiles: 5 },
      { type: "manual" },
      // steady passes, not currently quarantined → nothing to add or remove.
      { results: source(runs), state, readQuarantine: async () => [] },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });
});
