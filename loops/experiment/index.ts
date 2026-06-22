import {
  createGate,
  runPlan,
  type Gate,
  type PlanRunResult,
  type StateStore,
  type Step,
  type StepOutcome,
} from "../../src/core/index.js";
import type {
  ExperimentDesign,
  ExperimentDesigner,
  ExperimentPlatform,
  ExperimentResults,
  Hypothesis,
} from "./hooks/types.js";

export type {
  ExperimentDesign,
  ExperimentDesigner,
  ExperimentPlatform,
  ExperimentResults,
  Hypothesis,
} from "./hooks/types.js";

export interface ExperimentServices {
  designer: ExperimentDesigner;
  platform: ExperimentPlatform;
}

interface PlanInput {
  planId: string;
  hypothesis: Hypothesis;
  services: ExperimentServices;
  gate: Gate;
}

/** Typed read of a value previously merged into plan memory. */
function mem<T>(memory: Readonly<Record<string, unknown>>, key: string): T | undefined {
  return memory[key] as T | undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The experiment lifecycle as a resumable plan:
 *   design → approve-design (gate) → launch → bake (wait) → readout → decide (gate)
 *
 * Each step is safe to re-run; the plan persists progress via the StateStore and
 * resumes from where it paused (a human gate or a long-horizon bake).
 */
export function experimentSteps(): Step<PlanInput>[] {
  return [
    {
      name: "design",
      async run({ input }): Promise<StepOutcome> {
        const design = await input.services.designer(input.hypothesis);
        return { status: "done", data: { design } };
      },
    },
    {
      name: "approve-design",
      async run({ input, memory }): Promise<StepOutcome> {
        const design = mem<ExperimentDesign>(memory, "design");
        const gateId = `${input.planId}:design`;
        const req = await input.gate.require(
          gateId,
          `Approve experiment design for "${input.hypothesis.statement}" ` +
            `(${design?.durationDays ?? "?"}d, metric ${design?.metric ?? "?"}).`,
        );
        if (req.status === "pending") return { status: "blocked", gateId };
        if (req.status === "rejected") {
          return { status: "done", data: { rejected: true, finalDecision: "rejected" } };
        }
        return { status: "done" };
      },
    },
    {
      name: "launch",
      async run({ input, memory, now }): Promise<StepOutcome> {
        if (mem<boolean>(memory, "rejected")) return { status: "done" };
        const design = mem<ExperimentDesign>(memory, "design");
        if (!design) return { status: "done", data: { error: "missing design" } };
        const { experimentKey } = await input.services.platform.launch(input.hypothesis, design);
        return { status: "done", data: { experimentKey, launchedAtIso: now.toISOString() } };
      },
    },
    {
      name: "bake",
      async run({ input, memory, now }): Promise<StepOutcome> {
        if (mem<boolean>(memory, "rejected")) return { status: "done" };
        const experimentKey = mem<string>(memory, "experimentKey");
        if (!experimentKey) return { status: "done", data: { error: "missing experimentKey" } };

        // The step owns the wait→done transition: complete as soon as results are
        // available, otherwise keep waiting until the projected bake deadline.
        const results = await input.services.platform.results(experimentKey);
        if (results) return { status: "done", data: { results } };

        const design = mem<ExperimentDesign>(memory, "design");
        const launchedAtIso = mem<string>(memory, "launchedAtIso");
        const launchedAt = launchedAtIso ? Date.parse(launchedAtIso) : now.getTime();
        const untilIso = new Date(launchedAt + (design?.durationDays ?? 14) * DAY_MS).toISOString();
        return { status: "waiting", untilIso };
      },
    },
    {
      name: "readout",
      async run({ input, memory }): Promise<StepOutcome> {
        if (mem<boolean>(memory, "rejected")) return { status: "done" };
        const results = mem<ExperimentResults>(memory, "results");
        return { status: "done", data: { readout: renderReadout(input.hypothesis, results) } };
      },
    },
    {
      name: "decide",
      async run({ input, memory }): Promise<StepOutcome> {
        if (mem<boolean>(memory, "rejected")) {
          return { status: "done", data: { finalDecision: "rejected" } };
        }
        const results = mem<ExperimentResults>(memory, "results");
        const gateId = `${input.planId}:decision`;
        const req = await input.gate.require(
          gateId,
          `Ship decision for "${input.hypothesis.statement}": ` +
            `recommended ${results?.recommendation ?? "?"} ` +
            `(delta ${results?.metricDelta ?? "?"}, guardrail breached: ${results?.guardrailBreached ?? "?"}).`,
        );
        if (req.status === "pending") return { status: "blocked", gateId };
        if (req.status === "rejected") return { status: "done", data: { finalDecision: "hold" } };
        return { status: "done", data: { finalDecision: results?.recommendation ?? "iterate" } };
      },
    },
  ];
}

/** Render a human-readable experiment readout. */
export function renderReadout(hypothesis: Hypothesis, results?: ExperimentResults): string {
  if (!results) return `## Experiment readout: ${hypothesis.statement}\n\n_No results available._`;
  return [
    `## Experiment readout: ${hypothesis.statement}`,
    "",
    `- Metric: \`${hypothesis.metric}\` — delta **${results.metricDelta}** ` +
      `(${results.significant ? "significant" : "not significant"})`,
    `- Guardrails breached: **${results.guardrailBreached ? "yes" : "no"}**`,
    `- Recommendation: **${results.recommendation}**`,
    "",
    "_Generated by loopy experiment-orchestrator. Final ship/kill is human-gated._",
  ].join("\n");
}

/**
 * Advance one experiment's lifecycle by (re)running its plan. Call repeatedly
 * (e.g. on a schedule); it resumes from the last gate/bake pause and is a no-op
 * once completed. Returns the plan result, whose `memory` carries `design`,
 * `experimentKey`, `results`, `readout`, and `finalDecision` as they are produced.
 */
export async function advanceExperiment(
  planId: string,
  hypothesis: Hypothesis,
  services: ExperimentServices,
  store: StateStore,
  options?: { now?: () => Date },
): Promise<PlanRunResult> {
  const gate = createGate(store, options);
  const input: PlanInput = { planId, hypothesis, services, gate };
  return runPlan(planId, experimentSteps(), input, store, options);
}
