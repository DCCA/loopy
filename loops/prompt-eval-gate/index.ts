import {
  createGate,
  type ActResult,
  type DetectResult,
  type Guardrails,
  type Loop,
  type LoopManifest,
  type RunContext,
  type StateStore,
  type Trigger,
} from "../../src/core/index.js";
import {
  regressions,
  renderScorecard,
  runEval,
  type EvalSource,
  type Model,
  type Scorecard,
} from "./hooks/eval.js";

export type { EvalCase, EvalSource, Model, Scorecard } from "./hooks/eval.js";
export { grade, runEval, regressions, renderScorecard } from "./hooks/eval.js";

export interface PromptEvalConfig {
  /** file the promoted baseline scorecard is written to */
  baselinePath: string;
  /** minimum score improvement (over baseline) to propose a promotion */
  tolerance: number;
}

export interface PromptEvalServices {
  model: Model;
  evals: EvalSource;
  state: StateStore;
}

const KEY = "prompt-eval:baseline";
const PROMOTE_GATE = "prompt-eval:promote";

/**
 * Regression gate over a prompt eval set. Compares the current scorecard to a
 * baseline stored in the StateStore:
 * - no baseline → establish one (comment);
 * - regressions → blocking advisory comment (baseline unchanged);
 * - improvement → human-gated baseline promotion (comment until approved, then a PR
 *   writing the baseline file + persisting it to state).
 */
export function createPromptEvalLoop(
  config: PromptEvalConfig,
  guardrails: Guardrails,
  trigger: Trigger,
  services: PromptEvalServices,
): Loop {
  const gate = createGate(services.state);

  async function evaluate(): Promise<{ current: Scorecard; baseline: Scorecard | null }> {
    const current = await runEval(await services.evals.cases(), services.model);
    const baseline = await services.state.load<Scorecard>(KEY);
    return { current, baseline };
  }

  return {
    id: "prompt-eval-gate",
    trigger,
    guardrails,

    async detect(ctx: RunContext): Promise<DetectResult> {
      void ctx;
      const { current, baseline } = await evaluate();
      if (!baseline) return { workNeeded: true, reason: "no baseline yet" };
      const reg = regressions(baseline, current);
      const improved = current.score > baseline.score + config.tolerance;
      if (reg.length > 0) return { workNeeded: true, reason: `${reg.length} regression(s)`, affected: reg };
      if (improved) return { workNeeded: true, reason: "score improved" };
      return { workNeeded: false, reason: "no regressions; within tolerance" };
    },

    async act(ctx: RunContext): Promise<ActResult> {
      void ctx;
      const { current, baseline } = await evaluate();

      // First run: establish the baseline.
      if (!baseline) {
        await services.state.save(KEY, current);
        return {
          comment: renderScorecard(current, null, [], "Baseline established."),
          summary: "prompt-eval baseline established",
        };
      }

      // Regressions block (advisory); never move the baseline.
      const reg = regressions(baseline, current);
      if (reg.length > 0) {
        return {
          comment: renderScorecard(current, baseline, reg, "⚠️ Prompt eval regressed."),
          summary: `prompt-eval: ${reg.length} regression(s)`,
        };
      }

      // Improvement: gate the baseline promotion.
      const req = await gate.require(
        PROMOTE_GATE,
        `Promote prompt-eval baseline to score ${Math.round(current.score * 100)}%.`,
      );
      if (req.status !== "approved") {
        const note =
          req.status === "rejected"
            ? "Baseline promotion rejected; keeping the current baseline."
            : "Improvement detected — approve the promotion gate to update the baseline.";
        return { comment: renderScorecard(current, baseline, [], note), summary: "prompt-eval improvement pending" };
      }

      await services.state.save(KEY, current);
      return {
        changes: [{ path: config.baselinePath, op: "write", contents: JSON.stringify(current, null, 2) + "\n" }],
        summary: "prompt-eval baseline promoted",
      };
    },
  };
}

export function createPromptEvalLoopFromManifest(
  manifest: LoopManifest,
  services: PromptEvalServices,
): Loop {
  const c = manifest.config;
  const config: PromptEvalConfig = {
    baselinePath: typeof c["baselinePath"] === "string" ? c["baselinePath"] : "evals/baseline.json",
    tolerance: typeof c["tolerance"] === "number" ? c["tolerance"] : 0,
  };
  return createPromptEvalLoop(config, manifest.guardrails, manifest.trigger, services);
}
