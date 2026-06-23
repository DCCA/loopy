import { parseConventional, type Commit } from "../../changelog/hooks/conventional.js";

export type { Commit } from "../../changelog/hooks/conventional.js";

/** Boundary: where the unreleased commits and the current version come from. */
export interface ReleaseSource {
  unreleased(): Promise<Commit[]>;
  currentVersion(): Promise<string>;
}

export type Bump = "major" | "minor" | "patch";

interface ParsedCommit {
  type: string;
  scope?: string;
  subject: string;
  hash: string;
  breaking: boolean;
}

/** Section headings in render order, keyed by conventional type. */
const SECTION_ORDER: Array<[string, string]> = [
  ["feat", "Features"],
  ["fix", "Bug Fixes"],
  ["perf", "Performance"],
  ["refactor", "Refactors"],
  ["docs", "Documentation"],
  ["test", "Tests"],
  ["build", "Build System"],
  ["ci", "Continuous Integration"],
  ["chore", "Chores"],
];

const TYPE_TO_HEADING = new Map(SECTION_ORDER);
const OTHER_HEADING = "Other";

/**
 * Compute the next semver bump from a set of conventional commits.
 * A breaking commit forces a major; any feat forces (at least) a minor;
 * everything else is a patch. Returns null when there are no commits.
 */
export function computeBump(commits: Commit[]): Bump | null {
  if (commits.length === 0) return null;
  let bump: Bump = "patch";
  for (const commit of commits) {
    const parsed = parseConventional(commit);
    if (parsed.breaking) return "major";
    if (parsed.type === "feat") bump = "minor";
  }
  return bump;
}

/**
 * Parse a "x.y.z" version (tolerating a leading "v"), apply the bump, and
 * return the resulting "x.y.z" (no leading "v"). Throws if unparseable.
 */
export function nextVersion(current: string, bump: Bump): string {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(current.trim());
  if (!m) {
    throw new Error(`Cannot parse version "${current}"`);
  }
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);
  switch (bump) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
      patch += 1;
      break;
  }
  return `${major}.${minor}.${patch}`;
}

/**
 * Render a release-notes section "## <version> - <dateIso>" grouping commits by
 * conventional type. Returns markdown (no trailing newline).
 */
export function renderReleaseNotes(version: string, dateIso: string, commits: Commit[]): string {
  const parsed: ParsedCommit[] = commits.map(parseConventional);
  const groups = new Map<string, ParsedCommit[]>();
  for (const c of parsed) {
    const heading = TYPE_TO_HEADING.get(c.type) ?? OTHER_HEADING;
    const bucket = groups.get(heading) ?? [];
    bucket.push(c);
    groups.set(heading, bucket);
  }

  const orderedHeadings = [...SECTION_ORDER.map(([, h]) => h), OTHER_HEADING];
  const lines: string[] = [`## ${version} - ${dateIso}`, ""];

  const breaking = parsed.filter((c) => c.breaking);
  if (breaking.length > 0) {
    lines.push("### ⚠ BREAKING CHANGES", "");
    for (const c of breaking) lines.push(formatLine(c));
    lines.push("");
  }

  for (const heading of orderedHeadings) {
    const bucket = groups.get(heading);
    if (!bucket || bucket.length === 0) continue;
    lines.push(`### ${heading}`, "");
    for (const c of bucket) lines.push(formatLine(c));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatLine(c: ParsedCommit): string {
  const scope = c.scope ? `**${c.scope}:** ` : "";
  return `- ${scope}${c.subject} (\`${c.hash}\`)`;
}
