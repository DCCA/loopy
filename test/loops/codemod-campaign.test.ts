import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore, type FileChange, type StateStore } from "../../src/core/index.js";
import {
  advanceCampaign,
  remainingTargets,
  selectBatch,
  emptyLedger,
  type CampaignPrs,
  type CampaignServices,
  type CampaignSpec,
  type PrState,
} from "../../loops/codemod-campaign/index.js";

describe("campaign pure helpers", () => {
  it("remainingTargets excludes migrated and in-flight files", () => {
    const ledger = { ...emptyLedger(), migrated: ["a"], open: [{ prNumber: 1, branch: "b", files: ["b"] }] };
    expect(remainingTargets(["a", "b", "c", "d"], ledger)).toEqual(["c", "d"]);
  });
  it("selectBatch takes up to batchSize", () => {
    expect(selectBatch(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });
});

const spec = (over: Partial<CampaignSpec> = {}): CampaignSpec => ({
  batchSize: 2,
  maxOpenPrs: 5,
  title: "Migrate to X",
  ...over,
});

const changes: FileChange[] = [{ path: "src/a.ts", op: "write", contents: "x" }];

/** A fake PR backend whose per-PR state the test controls. */
function fakePrs(state: Map<number, PrState>): CampaignPrs & { opened: number[] } {
  let next = 0;
  const opened: number[] = [];
  return {
    opened,
    state: async (n) => state.get(n) ?? "open",
    open: async () => {
      next += 1;
      opened.push(next);
      state.set(next, "open");
      return { number: next };
    },
  };
}

function services(targets: string[], prs: CampaignPrs, ok = true): CampaignServices {
  return {
    codemod: async () => changes,
    targets: { targets: async () => targets },
    runner: async () => ({ ok, diagnostics: ok ? undefined : "tests red" }),
    prs,
  };
}

const id = "to-x";

describe("advanceCampaign lifecycle", () => {
  it("blocks on the pilot gate, then opens batches, throttles, reconciles, and completes", async () => {
    const store: StateStore = createMemoryStateStore();
    const prState = new Map<number, PrState>();
    const prs = fakePrs(prState);
    const targets = ["a", "b", "c", "d"];
    const gate = createGate(store);

    // 1. First advance → blocked on the pilot gate; no PR opened.
    let r = await advanceCampaign(id, spec(), services(targets, prs), store);
    expect(r.status).toBe("blocked");
    expect(r.gateId).toBe("to-x:pilot");
    expect(prs.opened).toHaveLength(0);

    // 2. Approve pilot → opens batch 1 [a,b].
    await gate.decide("to-x:pilot", "approved");
    r = await advanceCampaign(id, spec(), services(targets, prs), store);
    expect(r.status).toBe("batch-opened");
    expect(r.pr?.number).toBe(1);
    expect(r.ledger.open[0]?.files).toEqual(["a", "b"]);

    // 3. Next advance → opens batch 2 [c,d].
    r = await advanceCampaign(id, spec(), services(targets, prs), store);
    expect(r.status).toBe("batch-opened");
    expect(r.pr?.number).toBe(2);

    // 4. Both batches in flight, none remaining → waiting.
    r = await advanceCampaign(id, spec(), services(targets, prs), store);
    expect(r.status).toBe("waiting");

    // 5. Merge batch 1 → its files migrate; still waiting (batch 2 in flight).
    prState.set(1, "merged");
    r = await advanceCampaign(id, spec(), services(targets, prs), store);
    expect(r.ledger.migrated).toEqual(["a", "b"]);
    expect(r.status).toBe("waiting");

    // 6. Merge batch 2 → all migrated, nothing open → completed.
    prState.set(2, "merged");
    r = await advanceCampaign(id, spec(), services(targets, prs), store);
    expect(r.status).toBe("completed");
    expect(r.ledger.migrated).toEqual(["a", "b", "c", "d"]);
  });

  it("throttles at the open-PR cap", async () => {
    const store = createMemoryStateStore();
    const prs = fakePrs(new Map());
    const gate = createGate(store);
    const s = spec({ maxOpenPrs: 1 });

    await advanceCampaign(id, s, services(["a", "b", "c", "d"], prs), store); // blocked pilot
    await gate.decide("to-x:pilot", "approved");
    const opened = await advanceCampaign(id, s, services(["a", "b", "c", "d"], prs), store);
    expect(opened.status).toBe("batch-opened");
    const throttled = await advanceCampaign(id, s, services(["a", "b", "c", "d"], prs), store);
    expect(throttled.status).toBe("waiting");
    expect(throttled.reason).toMatch(/cap/);
  });

  it("fails the batch (no PR) when tests are red", async () => {
    const store = createMemoryStateStore();
    const prs = fakePrs(new Map());
    const gate = createGate(store);
    // approve pilot up-front so we reach the test gate
    await gate.require("to-x:pilot", "x");
    await gate.decide("to-x:pilot", "approved");
    const r = await advanceCampaign(id, spec(), services(["a", "b"], prs, false), store);
    expect(r.status).toBe("failed");
    expect(prs.opened).toHaveLength(0);
    expect(r.ledger.failedBatches).toBe(1);
  });
});
