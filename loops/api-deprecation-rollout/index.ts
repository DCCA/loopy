import {
  createGate,
  runPlan,
  type FileChange,
  type Gate,
  type PlanRunResult,
  type StateStore,
  type Step,
  type StepOutcome,
} from "../../src/core/index.js";
import {
  renderDeprecationNotice,
  renderRemovalNote,
  type ApiDeprecationServices,
  type ApiDeprecationSpec,
} from "./hooks/types.js";

export type { ApiDeprecationSpec, ApiDeprecationServices } from "./hooks/types.js";
export { renderDeprecationNotice, renderRemovalNote } from "./hooks/types.js";

interface PlanInput {
  planId: string;
  spec: ApiDeprecationSpec;
  services: ApiDeprecationServices;
  gate: Gate;
}

function mem<T>(memory: Readonly<Record<string, unknown>>, key: string): T | undefined {
  return memory[key] as T | undefined;
}

/**
 * The API-deprecation lifecycle as a resumable plan:
 *   announce → grace-period (WAIT) → verify-callers (drain) → approve-removal (gate) → remove
 *
 * Announces the deprecation, waits out a long-horizon grace period, re-checks
 * telemetry until callers drain, and only proposes the removal after human
 * approval. Resumes from the wait, the drain, or the gate.
 */
export function apiDeprecationSteps(): Step<PlanInput>[] {
  return [
    {
      name: "announce",
      async run({ input }): Promise<StepOutcome> {
        const notice: FileChange[] = [
          {
            path: input.spec.noticePath,
            op: "write",
            contents: renderDeprecationNotice(input.spec.api, input.spec.graceUntilIso),
          },
        ];
        return { status: "done", data: { notice } };
      },
    },
    {
      name: "grace-period",
      async run({ input, now }): Promise<StepOutcome> {
        if (now >= new Date(input.spec.graceUntilIso)) {
          return { status: "done" };
        }
        return { status: "waiting", untilIso: input.spec.graceUntilIso };
      },
    },
    {
      name: "verify-callers",
      async run({ input, now }): Promise<StepOutcome> {
        const n = await input.services.remainingCallers();
        if (n === 0) {
          return { status: "done", data: { callersClear: true } };
        }
        return { status: "waiting", untilIso: now.toISOString() };
      },
    },
    {
      name: "approve-removal",
      async run({ input }): Promise<StepOutcome> {
        const gateId = `${input.planId}:approve-removal`;
        const req = await input.gate.require(
          gateId,
          `Approve removal of \`${input.spec.api}\` — callers have drained and the grace period has elapsed.`,
        );
        if (req.status === "pending") return { status: "blocked", gateId };
        if (req.status === "rejected") return { status: "done", data: { decision: "hold" } };
        return { status: "done", data: { decision: "approved" } };
      },
    },
    {
      name: "remove",
      async run({ input, memory }): Promise<StepOutcome> {
        if (mem<string>(memory, "decision") !== "approved") {
          return { status: "done", data: { removed: false } };
        }
        const removal: FileChange[] = [
          {
            path: input.spec.removalPath,
            op: "write",
            contents: renderRemovalNote(input.spec.api),
          },
        ];
        return { status: "done", data: { removed: true, removal } };
      },
    },
  ];
}

export interface ApiDeprecationResult extends PlanRunResult {
  /** the deprecation-notice change set, present once announced */
  notice?: FileChange[];
  /** the removal change set, present once approved + removed */
  removal?: FileChange[];
  decision?: "approved" | "hold";
}

/**
 * Advance one API-deprecation rollout. Call repeatedly; resumes from the grace
 * wait, the caller-drain re-check, or the removal gate. When approved,
 * `result.removal` carries the removal change set for a caller/adapter to open
 * as a PR.
 */
export async function advanceApiDeprecation(
  planId: string,
  spec: ApiDeprecationSpec,
  services: ApiDeprecationServices,
  store: StateStore,
  options?: { now?: () => Date },
): Promise<ApiDeprecationResult> {
  const gate = createGate(store, options);
  const input: PlanInput = { planId, spec, services, gate };
  const result = await runPlan(planId, apiDeprecationSteps(), input, store, options);
  return {
    ...result,
    notice: mem<FileChange[]>(result.memory, "notice"),
    removal: mem<FileChange[]>(result.memory, "removal"),
    decision: mem<"approved" | "hold">(result.memory, "decision"),
  };
}
