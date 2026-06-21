import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { matchGlob } from "../../../src/core/index.js";

const DEFAULT_IGNORE = ["node_modules", ".git", "dist", "coverage"];

/**
 * Resolve repository-relative file paths under `repoRoot` that match any of the
 * given globs, skipping common build/vcs directories. Paths are normalized to
 * use `/` separators and returned sorted.
 */
export async function resolveFiles(
  repoRoot: string,
  globs: string[],
  ignore: string[] = DEFAULT_IGNORE,
): Promise<string[]> {
  const entries = await readdir(repoRoot, { recursive: true, withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const dir = entry.parentPath ?? repoRoot;
    const rel = relative(repoRoot, join(dir, entry.name)).split(sep).join("/");
    if (ignore.some((ig) => rel === ig || rel.startsWith(`${ig}/`))) continue;
    if (globs.some((g) => matchGlob(g, rel))) result.push(rel);
  }
  return result.sort();
}
