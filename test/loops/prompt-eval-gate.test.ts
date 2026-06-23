import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createPromptEvalLoop,
  grade,
  regressions,
  type EvalCase,
  type Model,
  type PromptEvalServices,
  type Scorecard,
} from "../../loops/prompt-eval-gate/index.js";
import { runLoop } from "../../src/core/index.js";

const ctx: RunContext = { repoRoot: "/tmp/repo", logger: silentLogger };
const cases: EvalCase[] = [
  { id: "greet", input: "say hi", expect: "hello" },
  { id: "math", input: "2+2", expect: "4" },
];

/** Model whose answers the test controls per input. */
const modelOf = (answers: Record<string, string>): Model => async (input) => answers[input] ?? "";

const guardrails = { pathAllowlist: ["evals/**"], maxFiles: 5 };
const trigger = { type: "event", events: ["pull_request"] } as const;
const config = { baselinePath: "evals/baseline.json", tolerance: 0 };

function loop(services: PromptEvalServices) {
  return createPromptEvalLoop(config, guardrails, trigger, services);
}

describe("eval helpers", () => {
  it("grades by substring (case-insensitive)", () => {
    expect(grade("Hello there", { id: "g", input: "", expect: "hello" })).toBe(true);
    expect(grade("nope", { id: "g", input: "", expect: "hello" })).toBe(false);
  });
  it("detects regressions", () => {
    const base: Scorecard = { score: 1, perCase: { a: true, b: true } };
    const cur: Scorecard = { score: 0.5, perCase: { a: true, b: false } };
    expect(regressions(base, cur)).toEqual(["b"]);
  });
});

describe("prompt-eval-gate loop", () => {
  it("establishes a baseline on the first run (comment + state saved)", async () => {
    const state = createMemoryStateStore();
    const r = await runLoop(
      loop({ model: modelOf({ "say hi": "hello", "2+2": "4" }), evals: { cases: async () => cases }, state }),
      ctx,
    );
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("Baseline established");
    expect(await state.load("prompt-eval:baseline")).not.toBeNull();
  });

  it("blocks with a comment on regression and keeps the baseline", async () => {
    const state = createMemoryStateStore();
    await state.save("prompt-eval:baseline", { score: 1, perCase: { greet: true, math: true } });
    const r = await runLoop(
      loop({ model: modelOf({ "say hi": "hello", "2+2": "wrong" }), evals: { cases: async () => cases }, state }),
      ctx,
    );
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("Regressions");
    expect(r.comment).toContain("`math`");
    const baseline = (await state.load("prompt-eval:baseline")) as Scorecard;
    expect(baseline.score).toBe(1); // unchanged
  });

  it("gates baseline promotion on improvement, then writes the baseline PR on approval", async () => {
    const state = createMemoryStateStore();
    await state.save("prompt-eval:baseline", { score: 0.5, perCase: { greet: true, math: false } });
    const services: PromptEvalServices = {
      model: modelOf({ "say hi": "hello", "2+2": "4" }), // now both pass → improvement
      evals: { cases: async () => cases },
      state,
    };

    // Improvement detected → blocked behind the promotion gate (comment).
    let r = await runLoop(loop(services), ctx);
    expect(r.outputKind).toBe("comment");
    expect(r.comment).toContain("approve the promotion gate");

    // Approve and re-run → baseline promotion PR.
    await createGate(state).decide("prompt-eval:promote", "approved");
    r = await runLoop(loop(services), ctx);
    expect(r.status).toBe("produced");
    expect(r.outputKind).toBe("pull-request");
    expect(r.changes?.[0]?.path).toBe("evals/baseline.json");
    const baseline = (await state.load("prompt-eval:baseline")) as Scorecard;
    expect(baseline.score).toBe(1);
  });

  it("does no work when stable within tolerance", async () => {
    const state = createMemoryStateStore();
    await state.save("prompt-eval:baseline", { score: 1, perCase: { greet: true, math: true } });
    const r = await runLoop(
      loop({ model: modelOf({ "say hi": "hello", "2+2": "4" }), evals: { cases: async () => cases }, state }),
      ctx,
    );
    expect(r.status).toBe("no-work");
  });
});
