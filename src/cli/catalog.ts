export interface CatalogTrigger {
  kind: "schedule" | "event";
  cron?: string;
  events?: string[];
}

export interface CatalogEntry {
  id: string;
  description: string;
  trigger: CatalogTrigger;
  output: "pull-request" | "comment";
  /** secrets the scaffolded workflow wires (GITHUB_TOKEN is always present) */
  secrets: string[];
}

const GH = "GITHUB_TOKEN";
const AI = "OPENROUTER_API_KEY";
const WEEKLY = "0 6 * * 1";

/** A loop needs an AI provider when it wires the AI secret. */
export function needsAi(entry: CatalogEntry): boolean {
  return entry.secrets.includes(AI);
}

/** The single source of truth backing `add`, `list`, and `run`. */
export const CATALOG: CatalogEntry[] = [
  {
    id: "auto-docs",
    description: "Update docs when the code surface drifts",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH, AI],
  },
  {
    id: "dep-updates",
    description: "One grouped PR bumping non-major dependency updates",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "changelog",
    description: "A changelog entry from unreleased commits",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "pr-review",
    description: "An advisory automated review comment on a PR",
    trigger: { kind: "event", events: ["pull_request"] },
    output: "comment",
    secrets: [GH, AI],
  },
  {
    id: "kb-gap",
    description: "Draft KB articles for recurring support topics (self-heal docs)",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH, AI],
  },
  {
    id: "test-coverage",
    description: "Backfill tests for uncovered changed lines (self-validating)",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH, AI],
  },
  {
    id: "security-remediation",
    description: "Human-gated fixes for security findings above a threshold",
    trigger: { kind: "schedule", cron: "0 6 * * *" },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "metric-anomaly",
    description: "Z-score anomaly briefs over your metrics",
    trigger: { kind: "schedule", cron: "0 7 * * *" },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "incident-followup",
    description: "Overdue postmortem action items + recurring root causes",
    trigger: { kind: "schedule", cron: "0 7 * * 1" },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "flake-quarantine",
    description: "Score flaky tests across runs and quarantine the worst",
    trigger: { kind: "schedule", cron: "0 7 * * *" },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "release-train",
    description: "Rolling Release PR from conventional commits",
    trigger: { kind: "event", events: ["push"] },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "license-sbom-drift",
    description: "Flag dependency licenses outside the allowlist",
    trigger: { kind: "schedule", cron: "0 7 * * 1" },
    output: "pull-request",
    secrets: [GH],
  },
  {
    id: "prompt-eval-gate",
    description: "Regression-gate prompts against a baseline; gated promotion",
    trigger: { kind: "event", events: ["pull_request"] },
    output: "pull-request",
    secrets: [GH, AI],
  },
];

export function getEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}

export function loopIds(): string[] {
  return CATALOG.map((e) => e.id);
}
