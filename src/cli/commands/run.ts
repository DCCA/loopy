import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";
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
  createGitHubDiffProvider,
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
import { createPrReviewLoopFromManifest, type DiffProvider } from "../../../loops/pr-review/index.js";
import {
  createKbGapLoopFromManifest,
  type Ticket,
  type TicketSource,
} from "../../../loops/kb-gap/index.js";
import {
  createDocWriter,
  createReviewer,
  createArticleWriter,
  createOpenAiCompatibleClient,
  resolveAiConfig,
  type AiClient,
} from "../../ai/index.js";
import { getEntry, type CatalogEntry } from "../catalog.js";

type Env = Record<string, string | undefined>;

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
  diffProvider?: DiffProvider;
  ticketSource?: TicketSource;
  coveredTopics?: () => Promise<string[]>;
  /** environment used for config resolution (defaults to process.env) */
  env?: Env;
}

export interface RunOutcome {
  ran: boolean;
  run?: RunResult;
  publish?: PublishResult;
  message?: string;
}

interface BuildContext {
  cwd: string;
  env: Env;
  options: RunOptions;
  prNumber?: number;
}

const DEFAULT_LOOPS_DIR = fileURLToPath(new URL("../../../../loops", import.meta.url));

export async function run(loopId: string, options: RunOptions = {}): Promise<RunOutcome> {
  const entry = getEntry(loopId);
  if (!entry) {
    throw new Error(`unknown loop "${loopId}". Run "loopy list".`);
  }

  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const loopsDir = options.loopsDir ?? DEFAULT_LOOPS_DIR;
  const logger = options.logger ?? consoleLogger;
  const manifestPath = join(loopsDir, loopId, "loop.yaml");
  const prNumber =
    options.prNumber ?? (entry.output === "comment" ? resolvePrNumber(env) : undefined);

  const built = await buildLoop(entry, manifestPath, { cwd, env, options, prNumber });
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

  const client = options.client ?? clientFromEnv(env);
  const publish = await publishRunResult(result, client, {
    baseBranch: options.baseBranch,
    guardrails: built.guardrails,
    prNumber,
  });
  return { ran: true, run: result, publish };
}

/** Build the loop, or return a human-readable reason it cannot run yet. */
async function buildLoop(
  entry: CatalogEntry,
  manifestPath: string,
  ctx: BuildContext,
): Promise<Loop | string> {
  const { cwd, env, options, prNumber } = ctx;
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
      const client = options.aiClient ?? aiClientFromEnv(env);
      if (!client) return aiGuidance("auto-docs");
      const manifest = await loadManifest(manifestPath);
      return createAutoDocsLoopFromManifest(manifest, { docWriter: createDocWriter(client) });
    }
    case "pr-review": {
      const client = options.aiClient ?? aiClientFromEnv(env);
      if (!client) return aiGuidance("pr-review");
      if (prNumber == null) {
        return (
          "`pr-review` needs a target PR number. Set LOOPY_PR_NUMBER — the scaffolded " +
          "workflow sets it from the pull_request event."
        );
      }
      const diff = options.diffProvider ?? diffProviderFromEnv(env, prNumber);
      if (!diff) {
        return "`pr-review` needs GITHUB_TOKEN and GITHUB_REPOSITORY to fetch the PR diff.";
      }
      const manifest = await loadManifest(manifestPath);
      return createPrReviewLoopFromManifest(manifest, { diff, reviewer: createReviewer(client) });
    }
    case "kb-gap": {
      const client = options.aiClient ?? aiClientFromEnv(env);
      if (!client) return aiGuidance("kb-gap");
      const tickets = options.ticketSource ?? ticketSourceFromEnv(env);
      if (!tickets) {
        return (
          "`kb-gap` needs resolved tickets. Set LOOPY_TICKETS_FILE to a JSON file containing an " +
          "array of { id, question, resolution?, topic? }."
        );
      }
      const manifest = await loadManifest(manifestPath);
      const kbDir = typeof manifest.config["kbDir"] === "string" ? manifest.config["kbDir"] : "docs/kb";
      const coveredTopics = options.coveredTopics ?? (() => coveredFromKbDir(cwd, kbDir));
      return createKbGapLoopFromManifest(manifest, {
        tickets,
        coveredTopics,
        articleWriter: createArticleWriter(client, kbDir),
      });
    }
    default:
      return (
        `\`${entry.id}\` is not runnable via the CLI yet (needs additional boundaries — ` +
        `see loops/${entry.id}/README.md).`
      );
  }
}

function aiGuidance(loopId: string): string {
  return (
    `\`${loopId}\` needs an AI provider. Set OPENROUTER_API_KEY (or LOOPY_AI_API_KEY / ` +
    `OPENAI_API_KEY) in the workflow; optionally LOOPY_AI_MODEL / LOOPY_AI_BASE_URL. ` +
    `See loops/${loopId}/README.md.`
  );
}

function aiClientFromEnv(env: Env): AiClient | null {
  const config = resolveAiConfig(env);
  if (!config) return null;
  return createOpenAiCompatibleClient({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    title: "loopy",
  });
}

function resolvePrNumber(env: Env): number | undefined {
  const explicit = env["LOOPY_PR_NUMBER"];
  if (explicit && /^\d+$/.test(explicit)) return Number(explicit);
  const match = env["GITHUB_REF"] ? /refs\/pull\/(\d+)\/merge/.exec(env["GITHUB_REF"]) : null;
  return match ? Number(match[1]) : undefined;
}

function ghParamsFromEnv(env: Env): { owner: string; repo: string; token: string } | null {
  const token = env["GITHUB_TOKEN"];
  const repository = env["GITHUB_REPOSITORY"];
  if (!token || !repository || !repository.includes("/")) return null;
  const [owner, repo] = repository.split("/");
  return { owner: owner ?? "", repo: repo ?? "", token };
}

function diffProviderFromEnv(env: Env, prNumber: number): DiffProvider | null {
  const gh = ghParamsFromEnv(env);
  if (!gh) return null;
  return createGitHubDiffProvider({ ...gh, prNumber });
}

function ticketSourceFromEnv(env: Env): TicketSource | null {
  const file = env["LOOPY_TICKETS_FILE"];
  if (!file) return null;
  return {
    listResolved: async (): Promise<Ticket[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
      return Array.isArray(parsed) ? (parsed as Ticket[]) : [];
    },
  };
}

/** Treat existing KB markdown filenames as already-covered topics. */
async function coveredFromKbDir(cwd: string, kbDir: string): Promise<string[]> {
  try {
    const entries = await readdir(join(cwd, kbDir));
    return entries
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, "").replace(/[-_]+/g, " "));
  } catch {
    return [];
  }
}

function clientFromEnv(env: Env): GitHubClient {
  const gh = ghParamsFromEnv(env);
  if (!gh) {
    throw new Error(
      "GITHUB_TOKEN and GITHUB_REPOSITORY (owner/repo) are required to open a PR or comment.",
    );
  }
  return createGitHubRestClient(gh);
}
