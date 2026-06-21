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
  /** true when `loopy run` can execute it with built-in default boundaries */
  runnable: boolean;
}

const GH = "GITHUB_TOKEN";
const AI = "ANTHROPIC_API_KEY";
const WEEKLY = "0 6 * * 1";

/** The single source of truth backing `add`, `list`, and `run`. */
export const CATALOG: CatalogEntry[] = [
  {
    id: "auto-docs",
    description: "Update docs when the code surface drifts",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH, AI],
    runnable: false,
  },
  {
    id: "dep-updates",
    description: "One grouped PR bumping non-major dependency updates",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH],
    runnable: true,
  },
  {
    id: "changelog",
    description: "A changelog entry from unreleased commits",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH],
    runnable: true,
  },
  {
    id: "pr-review",
    description: "An advisory automated review comment on a PR",
    trigger: { kind: "event", events: ["pull_request"] },
    output: "comment",
    secrets: [GH, AI],
    runnable: false,
  },
  {
    id: "test-coverage",
    description: "Backfill tests for uncovered changed lines (self-validating)",
    trigger: { kind: "schedule", cron: WEEKLY },
    output: "pull-request",
    secrets: [GH, AI],
    runnable: false,
  },
  {
    id: "security-remediation",
    description: "Human-gated fixes for security findings above a threshold",
    trigger: { kind: "schedule", cron: "0 6 * * *" },
    output: "pull-request",
    secrets: [GH],
    runnable: false,
  },
];

export function getEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}

export function loopIds(): string[] {
  return CATALOG.map((e) => e.id);
}
