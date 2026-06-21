import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { getEntry, loopIds } from "../catalog.js";
import { renderWorkflow } from "../template.js";

export interface AddOptions {
  cwd?: string;
}

export interface AddResult {
  /** repo-relative path of the written workflow */
  path: string;
  loopId: string;
  secrets: string[];
}

/**
 * The 1-click import: scaffold a ready-to-run workflow for `loopId` into
 * `.github/workflows/loopy-<loopId>.yml`.
 */
export async function add(loopId: string, options: AddOptions = {}): Promise<AddResult> {
  const entry = getEntry(loopId);
  if (!entry) {
    throw new Error(
      `unknown loop "${loopId}". Available: ${loopIds().join(", ")}. Run "loopy list".`,
    );
  }
  const cwd = options.cwd ?? process.cwd();
  const dir = join(cwd, ".github", "workflows");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `loopy-${loopId}.yml`);
  await writeFile(file, renderWorkflow(entry));

  return {
    path: relative(cwd, file).split("\\").join("/"),
    loopId,
    secrets: entry.secrets,
  };
}
