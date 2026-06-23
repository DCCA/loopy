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
import { regressions, type Scorecard } from "../prompt-eval-gate/index.js";
import type { ModelUpgradeServices, ModelUpgradeSpec } from "./hooks/types.js";

export type {
  ModelUpgradeSpec,
  ModelUpgradeServices,
  ModelEvaluator,
  Scorecard,
} from "./hooks/types.js";
export { renderUpgradeReport } from "./hooks/types.js";

interface PlanInput {
  planId: string;
  spec: ModelUpgradeSpec;
  services: ModelUpgradeServices;
  gate: Gate;
}

function mem<T>(memory: Readonly<Record<string, unknown>>, key: string): T | undefined {
  return memory[key] as T | undefined;
}

/**
 * The model-upgrade lifecycle as a resumable plan:
 *   baseline → candidate → diff → approve (gate) → apply
 *
 * Evaluates a golden set on the current and candidate models, diffs them, and
 * only proposes the model-id bump after human approval. Resumes from the gate.
 */
export function modelUpgradeSteps(): Step<PlanInput>[] {
  return [
    {
      name: "baseline",
      async run({ input }): Promise<StepOutcome> {
        return { status: "done", data: { baseline: await input.services.evaluate(input.spec.currentModel) } };
      },
    },
    {
      name: "candidate",
      async run({ input }): Promise<StepOutcome> {
        return { status: "done", data: { candidate: await input.services.evaluate(input.spec.candidateModel) } };
      },
    },
    {
      name: "diff",
      async run({ memory }): Promise<StepOutcome> {
        const baseline = mem<Scorecard>(memory, "baseline");
        const candidate = mem<Scorecard>(memory, "candidate");
        const regressed = baseline && candidate ? regressions(baseline, candidate) : [];
        const delta = baseline && candidate ? candidate.score - baseline.score : 0;
        return { status: "done", data: { regressed, delta } };
      },
    },
    {
      name: "approve",
      async run({ input, memory }): Promise<StepOutcome> {
        const regressed = mem<string[]>(memory, "regressed") ?? [];
        const delta = mem<number>(memory, "delta") ?? 0;
        const gateId = `${input.planId}:approve`;
        const req = await input.gate.require(
          gateId,
          `Approve model upgrade ${input.spec.currentModel} → ${input.spec.candidateModel} ` +
            `(Δscore ${Math.round(delta * 100)} pts, ${regressed.length} regression(s)).`,
        );
        if (req.status === "pending") return { status: "blocked", gateId };
        if (req.status === "rejected") return { status: "done", data: { decision: "hold" } };
        return { status: "done", data: { decision: "approved" } };
      },
    },
    {
      name: "apply",
      async run({ input, memory }): Promise<StepOutcome> {
        if (mem<string>(memory, "decision") !== "approved") {
          return { status: "done", data: { applied: false } };
        }
        const bump: FileChange[] = [
          {
            path: input.spec.configPath,
            op: "write",
            contents: JSON.stringify({ model: input.spec.candidateModel }, null, 2) + "\n",
          },
        ];
        return { status: "done", data: { applied: true, bump } };
      },
    },
  ];
}

export interface ModelUpgradeResult extends PlanRunResult {
  /** the model-id bump change set, present once approved + applied */
  bump?: FileChange[];
  decision?: "approved" | "hold";
}

/**
 * Advance one model-upgrade migration. Call repeatedly; resumes from the
 * approval gate. When approved, `result.bump` carries the model-id change set
 * for a caller/adapter to open as a PR.
 */
export async function advanceModelUpgrade(
  planId: string,
  spec: ModelUpgradeSpec,
  services: ModelUpgradeServices,
  store: StateStore,
  options?: { now?: () => Date },
): Promise<ModelUpgradeResult> {
  const gate = createGate(store, options);
  const input: PlanInput = { planId, spec, services, gate };
  const result = await runPlan(planId, modelUpgradeSteps(), input, store, options);
  return {
    ...result,
    bump: mem<FileChange[]>(result.memory, "bump"),
    decision: mem<"approved" | "hold">(result.memory, "decision"),
  };
}
