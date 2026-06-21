export interface CoverageGap {
  file: string;
  /** changed line numbers that lack coverage */
  lines: number[];
}

/** Supplies coverage data and the set of changed lines to evaluate against. */
export interface CoverageProvider {
  /** uncovered line numbers per file, from a coverage report */
  getUncovered(): Promise<Record<string, number[]>>;
  /** changed line numbers per file (e.g. from the PR/commit range) */
  getChangedLines(): Promise<Record<string, number[]>>;
}

/** Intersect changed lines with uncovered lines to find coverage gaps. */
export function findGaps(
  uncovered: Record<string, number[]>,
  changed: Record<string, number[]>,
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  for (const [file, changedLines] of Object.entries(changed)) {
    const uncoveredSet = new Set(uncovered[file] ?? []);
    const lines = changedLines.filter((l) => uncoveredSet.has(l)).sort((a, b) => a - b);
    if (lines.length > 0) gaps.push({ file, lines });
  }
  return gaps.sort((a, b) => a.file.localeCompare(b.file));
}
