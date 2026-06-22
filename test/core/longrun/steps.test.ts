import { describe, expect, it } from "vitest";
import {
  createGate,
  createMemoryStateStore,
  runPlan,
  type Step,
} from "../../../src/core/longrun/index.js";

interface Input {
  label: string;
}

describe("runPlan", () => {
  it("runs a 3-step plan to completion and merges memory", async () => {
    const store = createMemoryStateStore();
    const steps: Step<Input>[] = [
      { name: "a", run: async () => ({ status: "done", data: { a: 1 } }) },
      {
        name: "b",
        run: async (ctx) => ({ status: "done", data: { b: (ctx.memory.a as number) + 1 } }),
      },
      { name: "c", run: async () => ({ status: "done" }) },
    ];

    const result = await runPlan("p1", steps, { label: "x" }, store);
    expect(result.status).toBe("completed");
    expect(result.completedSteps).toEqual(["a", "b", "c"]);
    expect(result.memory).toEqual({ a: 1, b: 2 });
  });

  it("stops with status waiting and resumes/completes on a later runPlan", async () => {
    const store = createMemoryStateStore();
    let elapsed = false;
    const until = "2030-01-01T00:00:00.000Z";

    const steps: Step<Input>[] = [
      { name: "prep", run: async () => ({ status: "done", data: { prepared: true } }) },
      {
        name: "bake",
        run: async () =>
          elapsed ? { status: "done", data: { baked: true } } : { status: "waiting", untilIso: until },
      },
      { name: "finish", run: async () => ({ status: "done" }) },
    ];

    const first = await runPlan("p2", steps, { label: "x" }, store);
    expect(first.status).toBe("waiting");
    expect(first.currentStep).toBe("bake");
    expect(first.waitingUntilIso).toBe(until);
    expect(first.completedSteps).toEqual(["prep"]);

    // The wait has elapsed; the step now returns done on re-run.
    elapsed = true;
    const second = await runPlan("p2", steps, { label: "x" }, store);
    expect(second.status).toBe("completed");
    expect(second.completedSteps).toEqual(["prep", "bake", "finish"]);
    expect(second.memory).toEqual({ prepared: true, baked: true });
  });

  it("stops with status blocked and completes after the gate is approved", async () => {
    const store = createMemoryStateStore();
    const gate = createGate(store);
    const gateId = "human-ok";

    // The step drives the gate: it requires approval, then reads its status.
    const steps: Step<Input>[] = [
      {
        name: "review",
        run: async () => {
          const req = await gate.require(gateId, "Please approve");
          if (req.status === "approved") return { status: "done", data: { reviewed: true } };
          return { status: "blocked", gateId };
        },
      },
      { name: "apply", run: async () => ({ status: "done", data: { applied: true } }) },
    ];

    const first = await runPlan("p3", steps, { label: "x" }, store);
    expect(first.status).toBe("blocked");
    expect(first.blockedGateId).toBe(gateId);
    expect(first.currentStep).toBe("review");
    expect(first.completedSteps).toEqual([]);

    // A human approves out-of-band, then the plan resumes.
    await gate.decide(gateId, "approved");
    const second = await runPlan("p3", steps, { label: "x" }, store);
    expect(second.status).toBe("completed");
    expect(second.completedSteps).toEqual(["review", "apply"]);
    expect(second.memory).toEqual({ reviewed: true, applied: true });
  });

  it("persists resumption across two separate runPlan calls sharing one store", async () => {
    const store = createMemoryStateStore();
    const calls: string[] = [];
    let ready = false;

    const steps: Step<Input>[] = [
      {
        name: "one",
        run: async () => {
          calls.push("one");
          return { status: "done", data: { one: true } };
        },
      },
      {
        name: "two",
        run: async () => {
          calls.push("two");
          return ready ? { status: "done", data: { two: true } } : { status: "waiting", untilIso: "2030-01-01T00:00:00.000Z" };
        },
      },
    ];

    await runPlan("p4", steps, { label: "x" }, store);
    ready = true;
    const second = await runPlan("p4", steps, { label: "x" }, store);

    expect(second.status).toBe("completed");
    // Step "one" ran only once (it was already completed on the second call);
    // step "two" ran on both invocations.
    expect(calls).toEqual(["one", "two", "two"]);
    expect(second.memory).toEqual({ one: true, two: true });
  });
});
