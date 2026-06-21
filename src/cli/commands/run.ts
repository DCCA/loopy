import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  consoleLogger,
  loadManifest,
  runLoop,
  type Logger,
  type Loop,
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
import { createAutoDocsLoopFromManifest } from "../../../loops/auto-docs/index.js";
import {
  createDocWriter,
  createOpenAiCompatibleClient,
  resolveAiConfig,
  type AiClient,
} from "../../ai/index.js";
import { getEntry, type CatalogEntry } from "../catalog.js";

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
  aiClient?: AiClient;
  /** environment used for AI config resolution (defaults to process.env) */
  env?: Record<string, string | undefined>;
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

  const cwd = options.cwd ?? process.cwd();
  const loopsDir = options.loopsDir ?? DEFAULT_LOOPS_DIR;
  const logger = options.logger ?? consoleLogger;
  const manifestPath = join(loopsDir, loopId, "loop.yaml");

  const built = await buildLoop(entry, manifestPath, cwd, options);
  if (typeof built === "string") {
    return { ran: false, message: built };
  }

  const result = await runLoop(built, { repoRoot: cwd, logger, dryRun: options.dryRun });
  if (result.status !== "produced") {
    return { ran: true, run: result, publish: { status: "no-op", reason: result.status } };
  }
  if (options.dryRun) {
    return { ran: true, run: result, publish: { status: "no-op", reason: "dry-run" } };
  }

  const client = options.client ?? clientFromEnv(options.env);
  const publish = await publishRunResult(result, client, {
    baseBranch: options.baseBranch,
    guardrails: built.guardrails,
    prNumber: options.prNumber,
  });
  return { ran: true, run: result, publish };
}

/** Build the loop, or return a human-readable reason it cannot run yet. */
async function buildLoop(
  entry: CatalogEntry,
  manifestPath: string,
  cwd: string,
  options: RunOptions,
): Promise<Loop | string> {
  switch (entry.id) {
    case "dep-updates": {
      const manifest = await loadManifest(manifestPath);
      return createDepUpdatesLoopFromManifest(manifest, {
        registry: options.registry ?? createNpmRegistryClient(),
      });
    }
    case "changelog": {
      const manifest = await loadManifest(manifestPath);
      return createChangelogLoopFromManifest(manifest, {
        commits: options.commitProvider ?? createGitCommitProvider(cwd),
      });
    }
    case "auto-docs": {
      const client = options.aiClient ?? aiClientFromEnv(options.env);
      if (!client) {
        return (
          "`auto-docs` needs an AI provider. Set OPENROUTER_API_KEY (or LOOPY_AI_API_KEY / " +
          "OPENAI_API_KEY) in the workflow; optionally LOOPY_AI_MODEL / LOOPY_AI_BASE_URL. " +
          "See loops/auto-docs/README.md."
        );
      }
      const manifest = await loadManifest(manifestPath);
      return createAutoDocsLoopFromManifest(manifest, { docWriter: createDocWriter(client) });
    }
    default:
      return (
        `\`${entry.id}\` is not runnable via the CLI yet (needs additional boundaries — ` +
        `see loops/${entry.id}/README.md).`
      );
  }
}

function aiClientFromEnv(env?: Record<string, string | undefined>): AiClient | null {
  const config = resolveAiConfig(env ?? process.env);
  if (!config) return null;
  return createOpenAiCompatibleClient({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    title: "loopy",
  });
}

function clientFromEnv(env?: Record<string, string | undefined>): GitHubClient {
  const source = env ?? process.env;
  const token = source["GITHUB_TOKEN"];
  const repo = source["GITHUB_REPOSITORY"];
  if (!token || !repo || !repo.includes("/")) {
    throw new Error(
      "GITHUB_TOKEN and GITHUB_REPOSITORY (owner/repo) are required to open a PR or comment.",
    );
  }
  const [owner, name] = repo.split("/");
  return createGitHubRestClient({ owner: owner ?? "", repo: name ?? "", token });
}
