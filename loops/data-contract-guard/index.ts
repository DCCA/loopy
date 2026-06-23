import {
  createGate,
  type ActResult,
  type DetectResult,
  type FileChange,
  type Guardrails,
  type Loop,
  type LoopManifest,
  type RunContext,
  type StateStore,
  type Trigger,
} from "../../src/core/index.js";
import { diffSchema, isBreaking, type Change, type Schema, type SchemaSource } from "./hooks/contract.js";

export type { Field, Schema, SchemaSource, Change } from "./hooks/contract.js";
export { diffSchema, isBreaking } from "./hooks/contract.js";

export interface ContractConfig {
  /** path the approved schema baseline is written to on acceptance */
  baselinePath: string;
}

export interface ContractServices {
  source: SchemaSource;
  state: StateStore;
}

const KEY = "data-contract:baseline";
const ACCEPT_GATE = "data-contract:accept";

/**
 * Guards a data contract against breaking changes. Compares the current schema
 * to the last-approved baseline stored in the StateStore:
 * - no baseline → record the current schema as the baseline (comment);
 * - additive-only changes → auto-record the new baseline (comment);
 * - breaking changes → post a blocking comment and require a human Gate; until
 *   approved the baseline is unchanged, and on approval a PR writes the baseline
 *   file and persists the new baseline to state.
 */
export function createDataContractGuardLoop(
  config: ContractConfig,
  guardrails: Guardrails,
  trigger: Trigger,
  services: ContractServices,
): Loop {
  const gate = createGate(services.state);

  async function inspect(): Promise<{ current: Schema; prev: Schema | null; changes: Change[] }> {
    const current = await services.source.current();
    const prev = await services.state.load<Schema>(KEY);
    const changes = prev ? diffSchema(prev, current) : [];
    return { current, prev, changes };
  }

  return {
    id: "data-contract-guard",
    trigger,
    guardrails,

    async detect(ctx: RunContext): Promise<DetectResult> {
      void ctx;
      const { prev, changes } = await inspect();
      if (!prev) return { workNeeded: true, reason: "no baseline yet" };
      if (changes.length === 0) return { workNeeded: false, reason: "schema matches baseline" };
      return {
        workNeeded: true,
        reason: isBreaking(changes) ? `${changes.length} change(s), breaking` : `${changes.length} additive change(s)`,
        affected: changes.map((c) => c.field),
      };
    },

    async act(ctx: RunContext): Promise<ActResult> {
      void ctx;
      const { current, prev, changes } = await inspect();
      const dateIso = new Date().toISOString().slice(0, 10);

      // First run: establish the baseline.
      if (!prev) {
        await services.state.save(KEY, current);
        return { comment: "baseline established", summary: "data-contract baseline established" };
      }

      // Additive-only changes auto-record the new baseline.
      if (!isBreaking(changes)) {
        await services.state.save(KEY, current);
        return {
          comment: renderContractReport(changes, dateIso),
          summary: `data-contract: ${changes.length} additive change(s)`,
        };
      }

      // Breaking changes are gated behind a human approval.
      const breaking = changes.filter((c) => c.kind !== "added");
      const req = await gate.require(
        ACCEPT_GATE,
        `Accept ${breaking.length} breaking schema change(s) and move the baseline.`,
      );
      if (req.status !== "approved") {
        const note =
          req.status === "rejected"
            ? "Breaking changes rejected; keeping baseline."
            : "Breaking schema changes detected — approve the gate to accept.";
        return {
          comment: renderContractReport(changes, dateIso, note),
          summary: `data-contract: ${breaking.length} breaking change(s) ${req.status}`,
        };
      }

      await services.state.save(KEY, current);
      const changesOut: FileChange[] = [
        { path: config.baselinePath, op: "write", contents: JSON.stringify(current, null, 2) + "\n" },
      ];
      return { changes: changesOut, summary: "data-contract baseline accepted" };
    },
  };
}

export function createDataContractGuardLoopFromManifest(
  manifest: LoopManifest,
  services: ContractServices,
): Loop {
  const c = manifest.config;
  const config: ContractConfig = {
    baselinePath: typeof c["baselinePath"] === "string" ? c["baselinePath"] : "contracts/schema.json",
  };
  return createDataContractGuardLoop(config, manifest.guardrails, manifest.trigger, services);
}

const KIND_LABEL: Record<Change["kind"], string> = {
  removed: "removed field",
  "type-changed": "type changed",
  "required-added": "new required field",
  added: "new optional field",
};

/** Render a deterministic contract report; `note` overrides the default header line. */
export function renderContractReport(changes: Change[], dateIso: string, note?: string): string {
  const breaking = changes.filter((c) => c.kind !== "added");
  const additive = changes.filter((c) => c.kind === "added");

  const header =
    note ?? (breaking.length === 0 ? "Additive schema changes — baseline updated." : "Breaking schema changes detected.");

  const lines: string[] = ["## 🤖 loopy data-contract-guard", "", header, ""];

  if (breaking.length > 0) {
    lines.push("### Breaking changes", "");
    for (const c of breaking) {
      lines.push(`- \`${c.field}\` — ${KIND_LABEL[c.kind]}${c.detail ? ` (${c.detail})` : ""}`);
    }
    lines.push("", "_Breaking changes are blocking. Approve the gate to accept and move the baseline._", "");
  }

  if (additive.length > 0) {
    lines.push("### Additive changes", "");
    for (const c of additive) {
      lines.push(`- \`${c.field}\` — ${KIND_LABEL[c.kind]}`);
    }
    lines.push("");
  }

  lines.push(`_Generated ${dateIso} by loopy data-contract-guard._`);
  return lines.join("\n");
}
