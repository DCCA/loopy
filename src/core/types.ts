/**
 * The loop contract. Every loop, however simple or AI-driven, follows the same
 * shape: trigger -> detect -> act -> output -> guardrails.
 */

export type TriggerType = "schedule" | "event" | "manual";

export interface Trigger {
  type: TriggerType;
  /** cron expression, used when type is "schedule" */
  cron?: string;
  /** repo events, used when type is "event" (e.g. ["push", "pull_request"]) */
  events?: string[];
}

export interface Guardrails {
  /** glob patterns; every changed path must match at least one of these */
  pathAllowlist?: string[];
  /** maximum number of files a single run may change */
  maxFiles?: number;
  /** skip producing output when an equivalent loop PR is already open */
  skipIfOpenPr?: boolean;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface RunContext {
  /** absolute path to the repository root the loop operates on */
  repoRoot: string;
  logger: Logger;
  /** when true, never create real output; compute the change set only */
  dryRun?: boolean;
}

export interface DetectResult {
  /** whether there is work to do; when false the loop produces no output */
  workNeeded: boolean;
  /** human-readable explanation, surfaced in logs and PR bodies */
  reason?: string;
  /** the paths/targets the loop intends to touch */
  affected?: string[];
}

export type FileChange =
  | { path: string; op: "write"; contents: string }
  | { path: string; op: "delete" };

export interface ActResult {
  changes: FileChange[];
  /** summary used as the PR body / run report */
  summary: string;
}

export interface Loop {
  readonly id: string;
  readonly trigger: Trigger;
  readonly guardrails: Guardrails;
  /** decide whether there is work to do (cheap, deterministic where possible) */
  detect(ctx: RunContext): Promise<DetectResult>;
  /** perform the work and return a reviewable change set */
  act(ctx: RunContext, detected: DetectResult): Promise<ActResult>;
}

export type RunStatus = "no-work" | "produced" | "skipped" | "failed";

export interface RunResult {
  loopId: string;
  status: RunStatus;
  reason?: string;
  changes?: FileChange[];
  summary?: string;
  error?: Error;
}
