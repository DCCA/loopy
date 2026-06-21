import type {
  ActResult,
  DetectResult,
  Guardrails,
  Loop,
  LoopManifest,
  RunContext,
  Trigger,
} from "../../src/core/index.js";
import type { DiffProvider } from "./hooks/diff.js";
import { renderReview, type Reviewer } from "./hooks/review.js";

export interface PrReviewServices {
  diff: DiffProvider;
  reviewer: Reviewer;
}

/**
 * Advisory PR review loop. On a pull-request event it fetches the diff, runs an
 * AI reviewer, and posts a single comment. It never changes PR state (no merge,
 * approve, or close) — its output is a comment, not a pull request.
 */
export function createPrReviewLoop(
  guardrails: Guardrails,
  trigger: Trigger,
  services: PrReviewServices,
): Loop {
  return {
    id: "pr-review",
    trigger,
    guardrails,

    async detect(ctx: RunContext): Promise<DetectResult> {
      void ctx;
      const diff = await services.diff.getDiff();
      if (diff.files.length === 0) {
        return { workNeeded: false, reason: "empty diff" };
      }
      return {
        workNeeded: true,
        reason: `${diff.files.length} file(s) changed`,
        affected: diff.files.map((f) => f.path),
      };
    },

    async act(ctx: RunContext): Promise<ActResult> {
      void ctx;
      const diff = await services.diff.getDiff();
      const review = await services.reviewer(diff);
      return { comment: renderReview(review), summary: review.summary };
    },
  };
}

export function createPrReviewLoopFromManifest(
  manifest: LoopManifest,
  services: PrReviewServices,
): Loop {
  return createPrReviewLoop(manifest.guardrails, manifest.trigger, services);
}

export type { DiffProvider, PullRequestDiff, DiffFile } from "./hooks/diff.js";
export type { Reviewer, ReviewResult, ReviewIssue, ReviewSeverity } from "./hooks/review.js";
export { renderReview } from "./hooks/review.js";
