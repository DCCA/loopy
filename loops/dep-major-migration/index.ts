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
import { bumpManifest, type DepMajorServices, type DepMajorSpec } from "./hooks/types.js";

export type { DepMajorSpec, DepMajorServices, VerifyResult } from "./hooks/types.js";
export { bumpManifest, renderMigrationReport } from "./hooks/types.js";

interface PlanInput {
  planId: string;
  spec: DepMajorSpec;
  services: DepMajorServices;
  gate: Gate;
  /** injected boundary: returns the current package.json text */
  readManifest: () => Promise<string>;
}

function mem<T>(memory: Readonly<Record<string, unknown>>, key: string): T | undefined {
  return memory[key] as T | undefined;
}

/**
 * One major dependency bump as a resumable plan:
 *   verify → approve (gate, only if green) → apply
 *
 * Verifies the consumer's build/tests against the candidate version, then gates
 * the bump on a human. A red build is never gated and never proposed. Resumes
 * from the approval gate.
 */
export function depMajorSteps(): Step<PlanInput>[] {
  return [
    {
      name: "verify",
      async run({ input }): Promise<StepOutcome> {
        const r = await input.services.verify(input.spec.pkg, input.spec.toVersion);
        return { status: "done", data: { ok: r.ok, log: r.log } };
      },
    },
    {
      name: "approve",
      async run({ input, memory }): Promise<StepOutcome> {
        const ok = mem<boolean>(memory, "ok");
        // A red build is never gated and never proposed.
        if (ok !== true) return { status: "done", data: { decision: "hold" } };

        const { pkg, fromVersion, toVersion } = input.spec;
        const gateId = `${input.planId}:approve`;
        const req = await input.gate.require(
          gateId,
          `Approve major dependency bump ${pkg} ${fromVersion} → ${toVersion} (verification passed).`,
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
        const manifest = await input.readManifest();
        const bumped = bumpManifest(manifest, input.spec.pkg, input.spec.toVersion);
        const bump: FileChange[] = [{ path: input.spec.manifestPath, op: "write", contents: bumped }];
        return { status: "done", data: { applied: true, bump } };
      },
    },
  ];
}

export interface DepMajorResult extends PlanRunResult {
  /** the manifest bump change set, present once approved + applied */
  bump?: FileChange[];
  decision?: "approved" | "hold";
  /** whether verification passed */
  ok?: boolean;
  /** the verification log, surfaced for review (especially on a red build) */
  log?: string;
}

/**
 * Advance one major dependency migration. Call repeatedly with the same planId +
 * store; resumes from the approval gate. When approved, `result.bump` carries the
 * manifest change set for a caller/adapter to open as a PR. `readManifest` is the
 * injected boundary returning the current package.json text.
 */
export async function advanceDepMajorMigration(
  planId: string,
  spec: DepMajorSpec,
  services: DepMajorServices,
  store: StateStore,
  readManifest: () => Promise<string>,
  options?: { now?: () => Date },
): Promise<DepMajorResult> {
  const gate = createGate(store, options);
  const input: PlanInput = { planId, spec, services, gate, readManifest };
  const result = await runPlan(planId, depMajorSteps(), input, store, options);
  return {
    ...result,
    bump: mem<FileChange[]>(result.memory, "bump"),
    decision: mem<"approved" | "hold">(result.memory, "decision"),
    ok: mem<boolean>(result.memory, "ok"),
    log: mem<string>(result.memory, "log"),
  };
}
