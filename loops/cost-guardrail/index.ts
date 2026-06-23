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
import {
  idleResources,
  updateStreaks,
  type IdleResource,
  type ResourceUsage,
  type Streaks,
  type UsageSource,
} from "./hooks/usage.js";

export type {
  IdleResource,
  ResourceUsage,
  Streaks,
  UsageSource,
} from "./hooks/usage.js";
export { idleResources, updateStreaks } from "./hooks/usage.js";

const STREAKS_KEY = "cost-guardrail:streaks";
const REMEDIATE_GATE = "cost-guardrail:remediate";

export interface CostConfig {
  /** path the remediation report is written to when approved */
  reportPath: string;
  /** utilization at or below which a resource counts as idle, in [0, 1] */
  idleThreshold: number;
  /** consecutive idle observations required before a resource is flagged */
  minStreak: number;
}

export interface CostServices {
  usage: UsageSource;
  state: StateStore;
}

/**
 * Stateful, human-gated cost guardrail. Tracks per-resource idle streaks in the
 * `StateStore` and, once a resource has been idle for `minStreak` consecutive
 * observations, proposes a remediation report behind an approval gate.
 *
 * It never auto-deletes anything: the report PR *is* the remediation proposal,
 * and it is only produced after a human approves the gate. The streak counters
 * always advance on every run (even while gated), so the grace period is honest.
 */
export function createCostGuardrailLoop(
  config: CostConfig,
  guardrails: Guardrails,
  trigger: Trigger,
  services: CostServices,
): Loop {
  const gate = createGate(services.state);

  /**
   * Advance the idle-streak counters for this observation and persist them. The
   * streak is the durable accumulator that builds toward `minStreak`, so it must
   * move forward on *every* run — including runs that produce no work. detect is
   * the single place the counter advances; act reads the already-advanced value.
   */
  async function advanceStreaks(): Promise<{ streaks: Streaks; usage: ResourceUsage[] }> {
    const prev = (await services.state.load<Streaks>(STREAKS_KEY)) ?? {};
    const usage = await services.usage.current();
    const streaks = updateStreaks(prev, usage, config.idleThreshold);
    await services.state.save<Streaks>(STREAKS_KEY, streaks);
    return { streaks, usage };
  }

  return {
    id: "cost-guardrail",
    trigger,
    guardrails,

    async detect(ctx: RunContext): Promise<DetectResult> {
      void ctx;
      const { streaks, usage } = await advanceStreaks();
      const idle = idleResources(streaks, usage, config.minStreak);

      if (idle.length === 0) {
        return { workNeeded: false, reason: "no resources idle past the streak threshold" };
      }
      const total = totalCost(idle);
      return {
        workNeeded: true,
        reason: `${idle.length} idle resource(s), $${total}/mo`,
        affected: idle.map((r) => r.id),
      };
    },

    async act(ctx: RunContext): Promise<ActResult> {
      void ctx;
      // Read the streaks detect already advanced this run (do NOT advance again,
      // or the counter would double-count on every acted run).
      const streaks = (await services.state.load<Streaks>(STREAKS_KEY)) ?? {};
      const usage = await services.usage.current();

      const idle = idleResources(streaks, usage, config.minStreak);
      if (idle.length === 0) {
        return { changes: [], summary: "cost-guardrail: nothing idle past threshold" };
      }

      const total = totalCost(idle);
      const req = await gate.require(
        REMEDIATE_GATE,
        `Propose cost remediation for ${idle.length} idle resource(s), $${total}/mo.`,
      );

      if (req.status === "rejected") {
        return {
          comment: renderComment(idle, "Remediation rejected; keeping the resources untouched."),
          summary: "cost-guardrail: remediation rejected",
        };
      }

      if (req.status !== "approved") {
        return {
          comment: renderComment(
            idle,
            "Approve the cost-guardrail gate to propose remediation. (Nothing is ever auto-deleted.)",
          ),
          summary: "cost-guardrail: remediation pending approval",
        };
      }

      const dateIso = new Date().toISOString().slice(0, 10);
      const change: FileChange = {
        path: config.reportPath,
        op: "write",
        contents: renderCostReport(idle, dateIso),
      };
      return {
        changes: [change],
        summary: `cost-guardrail: remediation proposal for ${idle.length} idle resource(s), $${total}/mo`,
      };
    },
  };
}

export function createCostGuardrailLoopFromManifest(
  manifest: LoopManifest,
  services: CostServices,
): Loop {
  const c = manifest.config;
  const config: CostConfig = {
    reportPath:
      typeof c["reportPath"] === "string" ? c["reportPath"] : "reports/cost-guardrail.md",
    idleThreshold: typeof c["idleThreshold"] === "number" ? c["idleThreshold"] : 0.05,
    minStreak: typeof c["minStreak"] === "number" ? c["minStreak"] : 3,
  };
  return createCostGuardrailLoop(config, manifest.guardrails, manifest.trigger, services);
}

/** Render the deterministic remediation proposal, most expensive resource first. */
export function renderCostReport(idle: IdleResource[], dateIso: string): string {
  const total = totalCost(idle);
  const lines: string[] = [
    "# Cost guardrail remediation proposal",
    "",
    `_Generated ${dateIso} by loopy cost-guardrail._`,
    "",
    `Idle resources: ${idle.length} — estimated $${total}/mo recoverable.`,
    "",
    "| Resource | Idle streak | Monthly cost |",
    "| -------- | ----------- | ------------ |",
  ];

  if (idle.length === 0) {
    lines.push("| _(none)_ | | |");
  } else {
    for (const r of idle) {
      lines.push(`| \`${r.id}\` | ${r.streak} | $${r.monthlyCost} |`);
    }
  }

  lines.push(
    "",
    "This is a **proposal**, not an action. Nothing has been deleted. Review each",
    "resource and decommission it through your normal change process if appropriate.",
    "",
  );
  return lines.join("\n");
}

function renderComment(idle: IdleResource[], note: string): string {
  const total = totalCost(idle);
  const lines: string[] = [
    "## Cost guardrail",
    "",
    `${idle.length} resource(s) idle past the streak threshold — $${total}/mo:`,
    "",
  ];
  for (const r of idle) {
    lines.push(`- \`${r.id}\` (idle ${r.streak} observations, $${r.monthlyCost}/mo)`);
  }
  lines.push("", note);
  return lines.join("\n");
}

function totalCost(idle: IdleResource[]): number {
  return idle.reduce((sum, r) => sum + r.monthlyCost, 0);
}
