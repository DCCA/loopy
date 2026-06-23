import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore, type StateStore } from "../../src/core/index.js";
import {
  advanceModelUpgrade,
  type ModelUpgradeServices,
  type ModelUpgradeSpec,
  type Scorecard,
} from "../../loops/model-upgrade-migration/index.js";

const spec: ModelUpgradeSpec = {
  currentModel: "z-ai/glm-5.2",
  candidateModel: "z-ai/glm-6",
  configPath: "loopy.model.json",
};

/** Evaluator returning a canned scorecard per model id. */
const evalOf = (cards: Record<string, Scorecard>): ModelUpgradeServices => ({
  evaluate: async (modelId) => cards[modelId] ?? { score: 0, perCase: {} },
});

const planId = "glm6";

describe("model-upgrade-migration", () => {
  it("blocks at the approval gate, then emits the bump on approval", async () => {
    const store: StateStore = createMemoryStateStore();
    const gate = createGate(store);
    const services = evalOf({
      "z-ai/glm-5.2": { score: 0.8, perCase: { a: true, b: true, c: false } },
      "z-ai/glm-6": { score: 1, perCase: { a: true, b: true, c: true } }, // strictly better
    });

    let r = await advanceModelUpgrade(planId, spec, services, store);
    expect(r.status).toBe("blocked");
    expect(r.blockedGateId).toBe("glm6:approve");
    expect(r.memory["regressed"]).toEqual([]);

    await gate.decide("glm6:approve", "approved");
    r = await advanceModelUpgrade(planId, spec, services, store);
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("approved");
    expect(r.bump?.[0]?.path).toBe("loopy.model.json");
    const bump = r.bump?.[0];
    expect(bump && bump.op === "write" ? JSON.parse(bump.contents).model : "").toBe("z-ai/glm-6");
  });

  it("surfaces regressions and holds on rejection (no bump)", async () => {
    const store = createMemoryStateStore();
    const gate = createGate(store);
    const services = evalOf({
      "z-ai/glm-5.2": { score: 1, perCase: { a: true, b: true } },
      "z-ai/glm-6": { score: 0.5, perCase: { a: true, b: false } }, // b regressed
    });

    let r = await advanceModelUpgrade(planId, spec, services, store);
    expect(r.status).toBe("blocked");
    expect(r.memory["regressed"]).toEqual(["b"]);

    await gate.decide("glm6:approve", "rejected");
    r = await advanceModelUpgrade(planId, spec, services, store);
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("hold");
    expect(r.bump).toBeUndefined();
  });
});
