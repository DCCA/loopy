import { describe, expect, it } from "vitest";
import {
  createMemoryStateStore,
  runLoop,
  silentLogger,
  type RunContext,
  type StateStore,
} from "../../src/core/index.js";
import {
  createEvalSetDriftLoop,
  normalizeCategory,
  uncovered,
  type DriftConfig,
  type DriftSource,
} from "../../loops/eval-set-drift/index.js";

const SURFACED_KEY = "eval-set-drift:surfaced";

const config: DriftConfig = {
  reportPath: "reports/eval-drift.md",
};

const ctx = (): RunContext => ({ repoRoot: "/tmp/eval-set-drift-test", logger: silentLogger });

function source(evalCats: string[], prodCats: string[]): DriftSource {
  return {
    evalCategories: async () => evalCats,
    productionCategories: async () => prodCats,
  };
}

describe("normalizeCategory", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeCategory("  Billing   Refund ")).toBe("billing refund");
  });

  it("collapses inner tabs and newlines to single spaces", () => {
    expect(normalizeCategory("Login\t\nIssue")).toBe("login issue");
  });
});

describe("uncovered", () => {
  it("returns production categories not present in the eval set", () => {
    expect(uncovered(["login"], ["login", "billing"])).toEqual(["billing"]);
  });

  it("compares case-insensitively after normalization", () => {
    expect(uncovered(["Login Issue"], ["login   issue"])).toEqual([]);
  });

  it("de-duplicates the result", () => {
    expect(uncovered(["a"], ["b", "B", " b "])).toEqual(["b"]);
  });

  it("sorts ascending", () => {
    expect(uncovered([], ["delta", "alpha", "charlie"])).toEqual([
      "alpha",
      "charlie",
      "delta",
    ]);
  });

  it("drops empty categories after normalization", () => {
    expect(uncovered([], ["   ", "real"])).toEqual(["real"]);
  });
});

describe("eval-set-drift loop", () => {
  const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true };

  it("reports an uncovered category and records it in state", async () => {
    const state: StateStore = createMemoryStateStore();
    const loop = createEvalSetDriftLoop(
      config,
      guardrails,
      { type: "manual" },
      { source: source(["login"], ["login", "billing"]), state },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");

    const change = result.changes?.find((c) => c.path === "reports/eval-drift.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("billing");

    const saved = await state.load<string[]>(SURFACED_KEY);
    expect(saved).toContain("billing");
  });

  it("does no work on a second run with the same data (already surfaced)", async () => {
    const state: StateStore = createMemoryStateStore();
    const services = { source: source(["login"], ["login", "billing"]), state };

    const first = await runLoop(
      createEvalSetDriftLoop(config, guardrails, { type: "manual" }, services),
      ctx(),
    );
    expect(first.status).toBe("produced");

    const second = await runLoop(
      createEvalSetDriftLoop(config, guardrails, { type: "manual" }, services),
      ctx(),
    );
    expect(second.status).toBe("no-work");
  });

  it("does no work when the eval set fully covers production", async () => {
    const state: StateStore = createMemoryStateStore();
    const loop = createEvalSetDriftLoop(
      config,
      guardrails,
      { type: "manual" },
      { source: source(["login", "billing"], ["login", "billing"]), state },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });
});
