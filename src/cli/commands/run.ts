import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  consoleLogger,
  loadManifest,
  runLoop,
  type Logger,
  type RunResult,
} from "../../core/index.js";
import {
  createGitHubRestClient,
  publishRunResult,
  type GitHubClient,
  type PublishResult,
} from "../../adapters/github-action/index.js";
import {
  createDepUpdatesLoopFromManifest,
  createNpmRegistryClient,
  type RegistryClient,
} from "../../../loops/dep-updates/index.js";
import {
  createChangelogLoopFromManifest,
  createGitCommitProvider,
  type CommitProvider,
} from "../../../loops/changelog/index.js";
import { getEntry } from "../catalog.js";
import type { Loop } from "../../core/index.js";

export interface RunOptions {
  cwd?: string;
  /** directory containing the bundled loops (defaults to the package's loops/) */
  loopsDir?: string;
  /** GitHub client; defaults to one built from env */
  client?: GitHubClient;
  baseBranch?: string;
  /** target PR/issue number for comment-output loops */
  prNumber?: number;
  dryRun?: boolean;
  logger?: Logger;
  /** boundary overrides (primarily for tests) */
  registry?: RegistryClient;
  commitProvider?: CommitProvider;
}

export interface RunOutcome {
  ran: boolean;
  run?: RunResult;
  publish?: PublishResult;
  message?: string;
}

const DEFAULT_LOOPS_DIR = fileURLToPath(new URL("../../../../loops", import.meta.url));

export async function run(loopId: string, options: RunOptions = {}): Promise<RunOutcome> {
  const entry = getEntry(loopId);
  if (!entry) {
    throw new Error(`unknown loop "${loopId}". Run "loopy list".`);
  }

  if (!entry.runnable) {
    return {
      ran: false,
      message:
        `\`${loopId}\` needs an AI provider for its act step, which \`loopy run\` does ` +
        `not bundle yet. Use it programmatically (supply services.<boundary>) — see ` +
        `loops/${loopId}/README.md and playbook.md.`,
    };
  }

  const cwd = options.cwd ?? process.cwd();
  const loopsDir = options.loopsDir ?? DEFAULT_LOOPS_DIR;
  const logger = options.logger ?? consoleLogger;

  const loop = await buildLoop(loopId, join(loopsDir, loopId, "loop.yaml"), cwd, options);
  if (!loop) {
    return { ran: false, message: `\`${loopId}\` is not runnable via the CLI yet.` };
  }

  const result = await runLoop(loop, { repoRoot: cwd, logger, dryRun: options.dryRun });
  if (result.status !== "produced") {
    return { ran: true, run: result, publish: { status: "no-op", reason: result.status } };
  }
  if (options.dryRun) {
    return { ran: true, run: result, publish: { status: "no-op", reason: "dry-run" } };
  }

  const client = options.client ?? clientFromEnv();
  const publish = await publishRunResult(result, client, {
    baseBranch: options.baseBranch,
    guardrails: loop.guardrails,
    prNumber: options.prNumber,
  });
  return { ran: true, run: result, publish };
}

async function buildLoop(
  loopId: string,
  manifestPath: string,
  cwd: string,
  options: RunOptions,
): Promise<Loop | null> {
  const manifest = await loadManifest(manifestPath);
  switch (loopId) {
    case "dep-updates":
      return createDepUpdatesLoopFromManifest(manifest, {
        registry: options.registry ?? createNpmRegistryClient(),
      });
    case "changelog":
      return createChangelogLoopFromManifest(manifest, {
        commits: options.commitProvider ?? createGitCommitProvider(cwd),
      });
    default:
      return null; // loops requiring an AI provider are not turnkey yet
  }
}

function clientFromEnv(): GitHubClient {
  const token = process.env["GITHUB_TOKEN"];
  const repo = process.env["GITHUB_REPOSITORY"];
  if (!token || !repo || !repo.includes("/")) {
    throw new Error(
      "GITHUB_TOKEN and GITHUB_REPOSITORY (owner/repo) are required to open a PR or comment.",
    );
  }
  const [owner, name] = repo.split("/");
  return createGitHubRestClient({ owner: owner ?? "", repo: name ?? "", token });
}
