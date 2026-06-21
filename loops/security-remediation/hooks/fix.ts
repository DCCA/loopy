import type { FileChange } from "../../../src/core/index.js";
import type { Finding } from "./findings.js";

/**
 * Produces the file changes that remediate a finding (a dependency bump or a
 * codemod/AI fix). Returns an empty array when no automatic fix is available.
 * Injected so the loop is testable and not tied to a specific scanner/fixer.
 */
export type Fixer = (finding: Finding) => Promise<FileChange[]>;

/** Merge fix change sets, de-duplicating by path (last write wins). */
export function mergeChanges(sets: FileChange[][]): FileChange[] {
  const byPath = new Map<string, FileChange>();
  for (const set of sets) {
    for (const change of set) byPath.set(change.path, change);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}
