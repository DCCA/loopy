import type {
  ActResult,
  DetectResult,
  FileChange,
  Guardrails,
  Loop,
  LoopManifest,
  StateStore,
  Trigger,
} from "../../src/core/index.js";
import {
  flakyTests,
  mergeHistory,
  scoreHistory,
  stableTests,
  type FlakeScore,
  type History,
  type TestResultSource,
} from "./hooks/flake.js";

const HISTORY_KEY = "flake-quarantine:history";

export interface FlakeConfig {
  /** path to the quarantine manifest (a JSON array of test ids) */
  quarantinePath: string;
  /** path to the rendered leaderboard report */
  reportPath: string;
  /** how many recent observations to retain per test */
  window: number;
  /** minimum observations before a verdict is trusted */
  minObservations: number;
  /** flake-rate threshold above which a test is quarantined */
  flakeThreshold: number;
}

export interface FlakeServices {
  results: TestResultSource;
  state: StateStore;
  readQuarantine: () => Promise<string[]>;
}

/** The fully-computed picture for one run, derived without persisting anything. */
interface FlakePicture {
  merged: History;
  scores: FlakeScore[];
  current: string[];
  toAdd: string[];
  toRemove: string[];
}

export function createFlakeQuarantineLoop(
  config: FlakeConfig,
  guardrails: Guardrails,
  trigger: Trigger,
  services: FlakeServices,
): Loop {
  /** Compute the picture WITHOUT saving history; both detect and act use it. */
  async function computePicture(): Promise<FlakePicture> {
    const history = (await services.state.load<History>(HISTORY_KEY)) ?? {};
    const runs = await services.results.recent();
    const merged = mergeHistory(history, runs, config.window);
    const scores = scoreHistory(merged);
    const flaky = flakyTests(scores, config.minObservations, config.flakeThreshold);
    const stable = stableTests(scores, config.minObservations);
    const current = await services.readQuarantine();

    const currentSet = new Set(current);
    const stableSet = new Set(stable);
    const toAdd = flaky.filter((id) => !currentSet.has(id));
    const toRemove = current.filter((id) => stableSet.has(id));

    return { merged, scores, current, toAdd, toRemove };
  }

  return {
    id: "flake-quarantine",
    trigger,
    guardrails,

    async detect(): Promise<DetectResult> {
      const { toAdd, toRemove } = await computePicture();
      const workNeeded = toAdd.length > 0 || toRemove.length > 0;
      if (!workNeeded) {
        return { workNeeded: false, reason: "no flaky tests to quarantine or recover" };
      }
      const parts: string[] = [];
      if (toAdd.length > 0) parts.push(`${toAdd.length} to quarantine`);
      if (toRemove.length > 0) parts.push(`${toRemove.length} recovered`);
      return {
        workNeeded: true,
        reason: parts.join(", "),
        affected: [...toAdd, ...toRemove],
      };
    },

    async act(): Promise<ActResult> {
      const { merged, scores, current, toAdd, toRemove } = await computePicture();

      // Persist the accumulated history so the next run builds on it.
      await services.state.save<History>(HISTORY_KEY, merged);

      const removeSet = new Set(toRemove);
      const newQuarantine = Array.from(new Set([...current, ...toAdd]))
        .filter((id) => !removeSet.has(id))
        .sort();

      const dateIso = new Date().toISOString().slice(0, 10);
      const changes: FileChange[] = [
        {
          path: config.quarantinePath,
          op: "write",
          contents: JSON.stringify(newQuarantine, null, 2) + "\n",
        },
        {
          path: config.reportPath,
          op: "write",
          contents: renderFlakeReport(scores, newQuarantine, dateIso),
        },
      ];

      return { changes, summary: summarize(toAdd, toRemove) };
    },
  };
}

export function createFlakeQuarantineLoopFromManifest(
  manifest: LoopManifest,
  services: FlakeServices,
): Loop {
  const c = manifest.config;
  const config: FlakeConfig = {
    quarantinePath: typeof c["quarantinePath"] === "string" ? c["quarantinePath"] : "quarantine.json",
    reportPath: typeof c["reportPath"] === "string" ? c["reportPath"] : "reports/flaky-tests.md",
    window: typeof c["window"] === "number" ? c["window"] : 20,
    minObservations: typeof c["minObservations"] === "number" ? c["minObservations"] : 5,
    flakeThreshold: typeof c["flakeThreshold"] === "number" ? c["flakeThreshold"] : 0.2,
  };
  return createFlakeQuarantineLoop(config, manifest.guardrails, manifest.trigger, services);
}

/** Render the deterministic flakiness leaderboard, hottest first. */
export function renderFlakeReport(
  scores: FlakeScore[],
  currentQuarantine: string[],
  dateIso: string,
): string {
  const quarantined = new Set(currentQuarantine);
  const ranked = [...scores].sort((a, b) => b.flakeRate - a.flakeRate || b.flips - a.flips);

  const lines: string[] = [
    "# Flaky-test leaderboard",
    "",
    `_Generated ${dateIso} by loopy flake-quarantine._`,
    "",
    `Currently quarantined: ${currentQuarantine.length}`,
    "",
    "| Test | Obs | Flips | Flake rate | Quarantined |",
    "| ---- | --- | ----- | ---------- | ----------- |",
  ];

  if (ranked.length === 0) {
    lines.push("| _(no test history yet)_ | | | | |");
  } else {
    for (const s of ranked) {
      const rate = `${Math.round(s.flakeRate * 100)}%`;
      const mark = quarantined.has(s.testId) ? "yes" : "";
      lines.push(`| \`${s.testId}\` | ${s.observations} | ${s.flips} | ${rate} | ${mark} |`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function summarize(toAdd: string[], toRemove: string[]): string {
  const lines: string[] = ["## Flake quarantine update", ""];

  if (toAdd.length > 0) {
    lines.push("Quarantined newly-flaky tests:");
    lines.push(...toAdd.map((id) => `- \`${id}\``));
    lines.push("");
  }
  if (toRemove.length > 0) {
    lines.push("Un-quarantined recovered tests:");
    lines.push(...toRemove.map((id) => `- \`${id}\``));
    lines.push("");
  }

  lines.push(
    "_Generated by loopy flake-quarantine. Review before merging; quarantining masks real breakage._",
  );
  return lines.join("\n");
}

export type { TestRun, TestResultSource, FlakeScore, History } from "./hooks/flake.js";
export { mergeHistory, scoreHistory, flakyTests, stableTests } from "./hooks/flake.js";
