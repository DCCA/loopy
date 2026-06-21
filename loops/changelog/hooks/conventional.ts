export interface Commit {
  hash: string;
  subject: string;
}

export interface ParsedCommit {
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

/** Parse one Conventional Commit subject line. Falls back to type "other". */
export function parseConventional(commit: Commit): ParsedCommit {
  const m = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(commit.subject);
  if (!m) {
    return { type: "other", subject: commit.subject, hash: commit.hash, breaking: false };
  }
  const type = (m[1] ?? "other").toLowerCase();
  return {
    type,
    scope: m[2],
    subject: m[4] ?? commit.subject,
    hash: commit.hash,
    breaking: m[3] === "!",
  };
}

/**
 * Render a changelog entry for the given version/date from a list of commits,
 * grouped by Conventional Commit type. Returns markdown (no trailing newline).
 */
export function renderChangelogEntry(version: string, date: string, commits: Commit[]): string {
  const parsed = commits.map(parseConventional);
  const groups = new Map<string, ParsedCommit[]>();
  for (const c of parsed) {
    const heading = TYPE_TO_HEADING.get(c.type) ?? OTHER_HEADING;
    const bucket = groups.get(heading) ?? [];
    bucket.push(c);
    groups.set(heading, bucket);
  }

  const orderedHeadings = [...SECTION_ORDER.map(([, h]) => h), OTHER_HEADING];
  const lines: string[] = [`## ${version} - ${date}`, ""];

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
