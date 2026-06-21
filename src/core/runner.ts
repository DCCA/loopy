import { enforceGuardrails, GuardrailViolation } from "./guardrails.js";
import type { Loop, RunContext, RunResult } from "./types.js";

/**
 * Execute a single loop end-to-end. The runner is loop-agnostic: it reads no
 * loop-specific logic, only orchestrates the contract and enforces guardrails.
 *
 * It fails safe — on any error (including guardrail violations) it produces no
 * output and never partially applies a change set.
 */
export async function runLoop(loop: Loop, ctx: RunContext): Promise<RunResult> {
  try {
    const detected = await loop.detect(ctx);
    if (!detected.workNeeded) {
      ctx.logger.info(
        `[${loop.id}] no work needed${detected.reason ? `: ${detected.reason}` : ""}`,
      );
      return { loopId: loop.id, status: "no-work", reason: detected.reason };
    }

    const acted = await loop.act(ctx, detected);

    // Comment output channel (no file changes, so no path guardrails apply).
    if (acted.comment && acted.comment.trim().length > 0) {
      ctx.logger.info(`[${loop.id}] produced a comment`);
      return {
        loopId: loop.id,
        status: "produced",
        outputKind: "comment",
        comment: acted.comment,
        summary: acted.summary,
      };
    }

    const changes = acted.changes ?? [];
    if (changes.length === 0) {
      ctx.logger.info(`[${loop.id}] act produced no output`);
      return { loopId: loop.id, status: "no-work", reason: "act produced no output" };
    }

    enforceGuardrails(changes, loop.guardrails);

    ctx.logger.info(`[${loop.id}] produced ${changes.length} change(s)`);
    return {
      loopId: loop.id,
      status: "produced",
      outputKind: "pull-request",
      changes,
      summary: acted.summary,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const kind = error instanceof GuardrailViolation ? "guardrail violation" : "run failed";
    ctx.logger.error(`[${loop.id}] ${kind}, failing safe: ${error.message}`);
    return { loopId: loop.id, status: "failed", error };
  }
}
