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
  createMetricAnomalyLoopFromManifest,
  type MetricSeries,
  type MetricSource,
} from "../../../loops/metric-anomaly/index.js";
import {
  createIncidentFollowupLoopFromManifest,
  type ActionItem,
  type Incident,
  type IncidentSource,
} from "../../../loops/incident-followup/index.js";
import {
  createFlakeQuarantineLoopFromManifest,
  type TestRun,
  type TestResultSource,
} from "../../../loops/flake-quarantine/index.js";
import {
  createReleaseTrainLoopFromManifest,
  type ReleaseSource,
} from "../../../loops/release-train/index.js";
import {
  createLicenseSbomLoopFromManifest,
  type SbomEntry,
  type SbomSource,
} from "../../../loops/license-sbom-drift/index.js";
import { createFileStateStore, type StateStore } from "../../core/index.js";
import {
  createPromptEvalLoopFromManifest,
  type EvalCase,
  type EvalSource,
} from "../../../loops/prompt-eval-gate/index.js";
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
  metricSource?: MetricSource;
  incidentSource?: IncidentSource;
  testResults?: TestResultSource;
  stateStore?: StateStore;
  readQuarantine?: () => Promise<string[]>;
  releaseSource?: ReleaseSource;
  sbomSource?: SbomSource;
  evalSource?: EvalSource;
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
    options.prNumber ??
    (entry.output === "comment" || entry.trigger.kind === "event"
      ? resolvePrNumber(env)
      : undefined);

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
    case "metric-anomaly": {
      const metrics = options.metricSource ?? metricSourceFromEnv(env);
      if (!metrics) {
        return (
          "`metric-anomaly` needs metrics. Set LOOPY_METRICS_FILE to a JSON file containing an " +
          "array of { name, points: [{ t, value }] }."
        );
      }
      const manifest = await loadManifest(manifestPath);
      return createMetricAnomalyLoopFromManifest(manifest, { metrics });
    }
    case "incident-followup": {
      const incidents = options.incidentSource ?? incidentSourceFromEnv(env);
      if (!incidents) {
        return (
          "`incident-followup` needs incident data. Set LOOPY_INCIDENTS_FILE to a JSON file " +
          "containing { incidents: [...], actionItems: [...] }."
        );
      }
      const manifest = await loadManifest(manifestPath);
      return createIncidentFollowupLoopFromManifest(manifest, { incidents });
    }
    case "flake-quarantine": {
      const results = options.testResults ?? testResultsFromEnv(env);
      if (!results) {
        return (
          "`flake-quarantine` needs test results. Set LOOPY_TEST_RESULTS_FILE to a JSON file " +
          "containing an array of { id, testId, status, commit? }."
        );
      }
      const manifest = await loadManifest(manifestPath);
      const quarantinePath =
        typeof manifest.config["quarantinePath"] === "string"
          ? manifest.config["quarantinePath"]
          : "quarantine.json";
      const state = options.stateStore ?? createFileStateStore(join(cwd, ".loopy", "state"));
      const readQuarantine = options.readQuarantine ?? (() => readQuarantineFile(cwd, quarantinePath));
      return createFlakeQuarantineLoopFromManifest(manifest, { results, state, readQuarantine });
    }
    case "release-train": {
      const source = options.releaseSource ?? releaseSourceFromGit(cwd);
      const manifest = await loadManifest(manifestPath);
      return createReleaseTrainLoopFromManifest(manifest, { source });
    }
    case "license-sbom-drift": {
      const sbom = options.sbomSource ?? sbomFromEnv(env);
      if (!sbom) {
        return (
          "`license-sbom-drift` needs an SBOM. Set LOOPY_SBOM_FILE to a JSON file containing an " +
          "array of { name, version, license }."
        );
      }
      const manifest = await loadManifest(manifestPath);
      return createLicenseSbomLoopFromManifest(manifest, { sbom });
    }
    case "prompt-eval-gate": {
      const client = options.aiClient ?? aiClientFromEnv(env);
      if (!client) return aiGuidance("prompt-eval-gate");
      const evals = options.evalSource ?? evalSourceFromEnv(env);
      if (!evals) {
        return (
          "`prompt-eval-gate` needs an eval set. Set LOOPY_EVAL_CASES_FILE to a JSON file " +
          "containing an array of { id, input, expect }."
        );
      }
      const manifest = await loadManifest(manifestPath);
      const model = (input: string) => client.complete({ messages: [{ role: "user", content: input }] });
      const state = options.stateStore ?? createFileStateStore(join(cwd, ".loopy", "state"));
      return createPromptEvalLoopFromManifest(manifest, { model, evals, state });
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

function metricSourceFromEnv(env: Env): MetricSource | null {
  const file = env["LOOPY_METRICS_FILE"];
  if (!file) return null;
  return {
    series: async (): Promise<MetricSeries[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
      return Array.isArray(parsed) ? (parsed as MetricSeries[]) : [];
    },
  };
}

function incidentSourceFromEnv(env: Env): IncidentSource | null {
  const file = env["LOOPY_INCIDENTS_FILE"];
  if (!file) return null;
  return {
    incidents: async (): Promise<Incident[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as { incidents?: Incident[] };
      return Array.isArray(parsed.incidents) ? parsed.incidents : [];
    },
    actionItems: async (): Promise<ActionItem[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as { actionItems?: ActionItem[] };
      return Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
    },
  };
}

function testResultsFromEnv(env: Env): TestResultSource | null {
  const file = env["LOOPY_TEST_RESULTS_FILE"];
  if (!file) return null;
  return {
    recent: async (): Promise<TestRun[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
      return Array.isArray(parsed) ? (parsed as TestRun[]) : [];
    },
  };
}

async function readQuarantineFile(cwd: string, path: string): Promise<string[]> {
  try {
    const parsed = JSON.parse(await readFile(join(cwd, path), "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function releaseSourceFromGit(cwd: string): ReleaseSource {
  const provider = createGitCommitProvider(cwd);
  return {
    unreleased: () => provider.listUnreleased(),
    currentVersion: async (): Promise<string> => {
      try {
        const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as {
          version?: string;
        };
        return typeof pkg.version === "string" ? pkg.version : "0.0.0";
      } catch {
        return "0.0.0";
      }
    },
  };
}

function evalSourceFromEnv(env: Env): EvalSource | null {
  const file = env["LOOPY_EVAL_CASES_FILE"];
  if (!file) return null;
  return {
    cases: async (): Promise<EvalCase[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
      return Array.isArray(parsed) ? (parsed as EvalCase[]) : [];
    },
  };
}

function sbomFromEnv(env: Env): SbomSource | null {
  const file = env["LOOPY_SBOM_FILE"];
  if (!file) return null;
  return {
    current: async (): Promise<SbomEntry[]> => {
      const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
      return Array.isArray(parsed) ? (parsed as SbomEntry[]) : [];
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
