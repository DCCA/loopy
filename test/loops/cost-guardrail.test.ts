import { describe, expect, it } from "vitest";
import {
  createGate,
  createMemoryStateStore,
  runLoop,
  silentLogger,
  type RunContext,
  type StateStore,
} from "../../src/core/index.js";
import {
  createCostGuardrailLoop,
  idleResources,
  updateStreaks,
  type CostConfig,
  type ResourceUsage,
  type Streaks,
  type UsageSource,
} from "../../loops/cost-guardrail/index.js";

const config: CostConfig = {
  reportPath: "reports/cost-guardrail.md",
  idleThreshold: 0.05,
  minStreak: 3,
};

const ctx = (): RunContext => ({ repoRoot: "/tmp/cost-guardrail-test", logger: silentLogger });

function usageOf(...resources: ResourceUsage[]): UsageSource {
  return { current: async () => resources };
}

describe("updateStreaks", () => {
  it("increments the streak while a resource stays idle", () => {
    let streaks: Streaks = {};
    const usage = [{ id: "a", utilization: 0.0, monthlyCost: 100 }];
    streaks = updateStreaks(streaks, usage, 0.05);
    expect(streaks["a"]).toBe(1);
    streaks = updateStreaks(streaks, usage, 0.05);
    expect(streaks["a"]).toBe(2);
    streaks = updateStreaks(streaks, usage, 0.05);
    expect(streaks["a"]).toBe(3);
  });

  it("resets the streak to zero when the resource is used", () => {
    const streaks = updateStreaks(
      { a: 5 },
      [{ id: "a", utilization: 0.4, monthlyCost: 100 }],
      0.05,
    );
    expect(streaks["a"]).toBe(0);
  });

  it("treats utilization exactly at the threshold as idle", () => {
    const streaks = updateStreaks(
      { a: 2 },
      [{ id: "a", utilization: 0.05, monthlyCost: 100 }],
      0.05,
    );
    expect(streaks["a"]).toBe(3);
  });

  it("drops resources absent from the current snapshot", () => {
    const streaks = updateStreaks(
      { a: 3, gone: 9 },
      [{ id: "a", utilization: 0.0, monthlyCost: 100 }],
      0.05,
    );
    expect(streaks["a"]).toBe(4);
    expect(streaks["gone"]).toBeUndefined();
  });

  it("does not mutate the input streaks", () => {
    const input: Streaks = { a: 1 };
    updateStreaks(input, [{ id: "a", utilization: 0.0, monthlyCost: 100 }], 0.05);
    expect(input["a"]).toBe(1);
  });
});

describe("idleResources", () => {
  it("flags only resources at or above minStreak", () => {
    const usage = [
      { id: "ready", utilization: 0.0, monthlyCost: 50 },
      { id: "warming", utilization: 0.0, monthlyCost: 50 },
    ];
    const idle = idleResources({ ready: 3, warming: 2 }, usage, 3);
    expect(idle.map((r) => r.id)).toEqual(["ready"]);
  });

  it("sorts flagged resources by monthly cost, descending", () => {
    const usage = [
      { id: "cheap", utilization: 0.0, monthlyCost: 10 },
      { id: "pricey", utilization: 0.0, monthlyCost: 900 },
      { id: "mid", utilization: 0.0, monthlyCost: 100 },
    ];
    const idle = idleResources({ cheap: 5, pricey: 5, mid: 5 }, usage, 3);
    expect(idle.map((r) => r.id)).toEqual(["pricey", "mid", "cheap"]);
    expect(idle[0]?.streak).toBe(5);
  });

  it("ignores resources not present in the snapshot", () => {
    const idle = idleResources({ ghost: 9 }, [], 3);
    expect(idle).toEqual([]);
  });
});

describe("cost-guardrail loop", () => {
  const STREAKS_KEY = "cost-guardrail:streaks";
  const GATE_ID = "cost-guardrail:remediate";

  it("builds a streak and eventually blocks on the gate, then produces a PR once approved", async () => {
    const state: StateStore = createMemoryStateStore();
    const source = usageOf({ id: "idle-db", utilization: 0.0, monthlyCost: 420 });
    const loop = createCostGuardrailLoop(
      config,
      { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true },
      { type: "manual" },
      { usage: source, state },
    );

    // Run 1 and 2: streak below minStreak (3) → no work yet.
    expect((await runLoop(loop, ctx())).status).toBe("no-work");
    expect((await runLoop(loop, ctx())).status).toBe("no-work");
    expect((await state.load<Streaks>(STREAKS_KEY))?.["idle-db"]).toBe(2);

    // Run 3: streak reaches 3 → gate pending → blocking comment.
    const blocked = await runLoop(loop, ctx());
    expect(blocked.status).toBe("produced");
    expect(blocked.outputKind).toBe("comment");
    expect(blocked.comment).toContain("idle-db");
    expect(blocked.comment).toContain("Approve");
    expect((await state.load<Streaks>(STREAKS_KEY))?.["idle-db"]).toBe(3);

    // A human approves the remediation gate.
    await createGate(state).decide(GATE_ID, "approved");

    // Re-run: now the report PR is produced.
    const approved = await runLoop(loop, ctx());
    expect(approved.status).toBe("produced");
    expect(approved.outputKind).toBe("pull-request");
    const change = approved.changes?.find((c) => c.path === "reports/cost-guardrail.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("idle-db");
    expect(contents).toContain("remediation proposal");
    // Streak keeps advancing on every run.
    expect((await state.load<Streaks>(STREAKS_KEY))?.["idle-db"]).toBe(4);
  });

  it("never reaches the gate for a busy resource", async () => {
    const state: StateStore = createMemoryStateStore();
    const source = usageOf({ id: "busy-api", utilization: 0.8, monthlyCost: 1000 });
    const loop = createCostGuardrailLoop(
      config,
      { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true },
      { type: "manual" },
      { usage: source, state },
    );

    for (let i = 0; i < 5; i++) {
      expect((await runLoop(loop, ctx())).status).toBe("no-work");
    }
    expect((await state.load<Streaks>(STREAKS_KEY))?.["busy-api"]).toBe(0);
    // The gate was never even requested.
    expect(await createGate(state).get(GATE_ID)).toBeNull();
  });
});
