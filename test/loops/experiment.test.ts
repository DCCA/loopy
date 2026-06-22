import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore, type StateStore } from "../../src/core/index.js";
import {
  advanceExperiment,
  renderReadout,
  type ExperimentPlatform,
  type ExperimentResults,
  type ExperimentServices,
  type Hypothesis,
} from "../../loops/experiment/index.js";

const hypothesis: Hypothesis = {
  id: "exp-1",
  statement: "Bigger CTA increases signups",
  metric: "signup_rate",
  guardrailMetrics: ["latency_p95"],
};

const design = {
  variants: ["control", "bigger-cta"],
  metric: "signup_rate",
  guardrailMetrics: ["latency_p95"],
  minSampleSize: 10000,
  durationDays: 14,
};

const shipResults: ExperimentResults = {
  significant: true,
  metricDelta: 0.04,
  guardrailBreached: false,
  recommendation: "ship",
};

/** Platform whose results readiness is toggled by the test. */
function platform(ready: { value: ExperimentResults | null }): ExperimentPlatform {
  return {
    launch: async () => ({ experimentKey: "key-1" }),
    results: async () => ready.value,
  };
}

const services = (ready: { value: ExperimentResults | null }): ExperimentServices => ({
  designer: async () => design,
  platform: platform(ready),
});

const planId = "exp-1";

describe("renderReadout", () => {
  it("summarizes results and notes the human gate", () => {
    const md = renderReadout(hypothesis, shipResults);
    expect(md).toContain("Recommendation: **ship**");
    expect(md).toContain("human-gated");
  });
});

describe("experiment orchestrator", () => {
  it("runs the full lifecycle: blocks at design gate, bakes, blocks at decision, completes", async () => {
    const store: StateStore = createMemoryStateStore();
    const ready: { value: ExperimentResults | null } = { value: null };
    const gate = createGate(store);

    // 1. First advance → blocked awaiting design approval.
    let result = await advanceExperiment(planId, hypothesis, services(ready), store);
    expect(result.status).toBe("blocked");
    expect(result.blockedGateId).toBe("exp-1:design");
    expect(result.currentStep).toBe("approve-design");

    // 2. Approve the design → next advance proceeds to launch then waits to bake.
    await gate.decide("exp-1:design", "approved");
    result = await advanceExperiment(planId, hypothesis, services(ready), store);
    expect(result.status).toBe("waiting");
    expect(result.currentStep).toBe("bake");
    expect(result.completedSteps).toContain("launch");
    expect(result.memory["experimentKey"]).toBe("key-1");

    // 3. Results land → next advance reads out and blocks at the decision gate.
    ready.value = shipResults;
    result = await advanceExperiment(planId, hypothesis, services(ready), store);
    expect(result.status).toBe("blocked");
    expect(result.blockedGateId).toBe("exp-1:decision");
    expect(String(result.memory["readout"])).toContain("Recommendation: **ship**");

    // 4. Approve the ship decision → plan completes.
    await gate.decide("exp-1:decision", "approved");
    result = await advanceExperiment(planId, hypothesis, services(ready), store);
    expect(result.status).toBe("completed");
    expect(result.memory["finalDecision"]).toBe("ship");
  });

  it("short-circuits to rejected when the design is rejected", async () => {
    const store: StateStore = createMemoryStateStore();
    const ready: { value: ExperimentResults | null } = { value: null };
    const gate = createGate(store);

    await advanceExperiment(planId, hypothesis, services(ready), store);
    await gate.decide("exp-1:design", "rejected");
    const result = await advanceExperiment(planId, hypothesis, services(ready), store);

    expect(result.status).toBe("completed");
    expect(result.memory["finalDecision"]).toBe("rejected");
    // Never launched.
    expect(result.memory["experimentKey"]).toBeUndefined();
  });
});
