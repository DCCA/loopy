import type { StateStore } from "./state.js";

/**
 * The result of running a single {@link Step}.
 *
 * - `done`    — the step finished; optional `data` is merged into plan memory.
 * - `waiting` — the step needs to pause until `untilIso` (a long-horizon wait,
 *               e.g. baking an experiment); the step is NOT completed.
 * - `blocked` — the step is waiting on a human approval identified by `gateId`;
 *               the step is NOT completed.
 */
export type StepOutcome =
  | { status: "done"; data?: Record<string, unknown> }
  | { status: "waiting"; untilIso: string }
  | { status: "blocked"; gateId: string };

/** Context handed to a step on each invocation. */
export interface StepContext<C> {
  input: C;
  /** Accumulated plan memory (read-only view of prior steps' merged data). */
  memory: Readonly<Record<string, unknown>>;
  now: Date;
}

/** One unit of work in a plan. Steps must be safe to re-run (idempotent). */
export interface Step<C> {
  name: string;
  run(ctx: StepContext<C>): Promise<StepOutcome>;
}

/** Overall status of a plan after a `runPlan` invocation. */
export type PlanStatus = "completed" | "waiting" | "blocked" | "running";

export interface PlanRunResult {
  planId: string;
  status: PlanStatus;
  completedSteps: string[];
  /** set when status is "waiting" */
  waitingUntilIso?: string;
  /** set when status is "blocked" */
  blockedGateId?: string;
  /** the current step that produced waiting/blocked, if any */
  currentStep?: string;
  memory: Record<string, unknown>;
}

/** Shape persisted under `plan:<planId>` between invocations. */
interface PlanState {
  completedSteps: string[];
  memory: Record<string, unknown>;
}

/** Namespace plan progress so it doesn't collide with other StateStore keys. */
function keyFor(planId: string): string {
  return `plan:${planId}`;
}

/**
 * Run (or resume) a multi-step plan.
 *
 * Progress is persisted under `plan:<planId>` in the {@link StateStore} as
 * `{ completedSteps, memory }`, so calling `runPlan` again with the same store
 * and planId continues from the first not-yet-completed step.
 *
 * Resumption contract for non-terminal outcomes:
 *
 * - `waiting`: the step is NOT marked completed. We persist current progress and
 *   return `{ status: "waiting", waitingUntilIso, currentStep }`. The same step
 *   will be re-run on the next `runPlan`. Whether `untilIso` is in the past or
 *   future, we always return waiting — the STEP itself is responsible for
 *   returning `done` once it observes that the wait has elapsed (it can compare
 *   `ctx.now` against its own deadline). This keeps `runPlan` free of polling /
 *   infinite-loop concerns and makes waits resumable across processes.
 *
 * - `blocked`: the step is NOT marked completed. We persist and return
 *   `{ status: "blocked", blockedGateId, currentStep }`. The step is re-run on
 *   the next `runPlan`; it should consult the relevant gate/approval source and
 *   return `done` (or stay `blocked`) accordingly.
 *
 * Only `done` advances the plan: its optional `data` is merged into memory and
 * the step name is appended to `completedSteps`.
 */
export async function runPlan<C>(
  planId: string,
  steps: Step<C>[],
  input: C,
  store: StateStore,
  options?: { now?: () => Date },
): Promise<PlanRunResult> {
  const now = options?.now ?? (() => new Date());

  const loaded = await store.load<PlanState>(keyFor(planId));
  const state: PlanState = loaded ?? { completedSteps: [], memory: {} };
  const completed = new Set(state.completedSteps);

  for (const step of steps) {
    // Skip steps that already finished in a prior invocation.
    if (completed.has(step.name)) continue;

    const outcome = await step.run({
      input,
      memory: state.memory,
      now: now(),
    });

    if (outcome.status === "waiting") {
      // Persist progress (no step completion) and pause until the step itself
      // decides the wait has elapsed on a later invocation.
      await store.save(keyFor(planId), state);
      return {
        planId,
        status: "waiting",
        completedSteps: [...state.completedSteps],
        waitingUntilIso: outcome.untilIso,
        currentStep: step.name,
        memory: { ...state.memory },
      };
    }

    if (outcome.status === "blocked") {
      // Persist progress (no step completion) and pause until approval lands.
      await store.save(keyFor(planId), state);
      return {
        planId,
        status: "blocked",
        completedSteps: [...state.completedSteps],
        blockedGateId: outcome.gateId,
        currentStep: step.name,
        memory: { ...state.memory },
      };
    }

    // status === "done": merge any produced data and mark the step complete.
    if (outcome.data) {
      state.memory = { ...state.memory, ...outcome.data };
    }
    state.completedSteps = [...state.completedSteps, step.name];
    completed.add(step.name);
    await store.save(keyFor(planId), state);
  }

  return {
    planId,
    status: "completed",
    completedSteps: [...state.completedSteps],
    memory: { ...state.memory },
  };
}
