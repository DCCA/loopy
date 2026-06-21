import { consoleLogger, loadManifest, runLoop } from "../../core/index.js";
import type { RunResult } from "../../core/index.js";
import {
  createAutoDocsLoopFromManifest,
  type AutoDocsServices,
} from "../../../loops/auto-docs/index.js";
import { publishRunResult, type GitHubClient, type PublishResult } from "./index.js";

export interface RunAutoDocsOptions {
  /** absolute path to the repo being operated on */
  repoRoot: string;
  /** path to the auto-docs loop.yaml manifest */
  manifestPath: string;
  /** GitHub client used to open the PR */
  client: GitHubClient;
  /** loop services, notably the AI-backed doc writer */
  services: AutoDocsServices;
  baseBranch?: string;
  /** when true, compute changes but never open a PR */
  dryRun?: boolean;
}

export interface AutoDocsActionResult {
  run: RunResult;
  publish: PublishResult;
}

/**
 * Orchestrate the auto-docs loop for the GitHub Action adapter:
 * load manifest -> build loop -> run -> publish PR.
 */
export async function runAutoDocsAction(
  opts: RunAutoDocsOptions,
): Promise<AutoDocsActionResult> {
  const manifest = await loadManifest(opts.manifestPath);
  const loop = createAutoDocsLoopFromManifest(manifest, opts.services);
  const run = await runLoop(loop, {
    repoRoot: opts.repoRoot,
    logger: consoleLogger,
    dryRun: opts.dryRun,
  });

  if (run.status !== "produced") {
    return { run, publish: { status: "no-op", reason: `run status was "${run.status}"` } };
  }
  if (opts.dryRun) {
    return { run, publish: { status: "no-op", reason: "dry-run" } };
  }

  const publish = await publishRunResult(run, opts.client, {
    baseBranch: opts.baseBranch,
    guardrails: loop.guardrails,
  });
  return { run, publish };
}
