import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Commit } from "./conventional.js";

const exec = promisify(execFile);

/** Supplies the commits that should appear in the next changelog entry. */
export interface CommitProvider {
  /** commits since the last release/tag, newest first */
  listUnreleased(): Promise<Commit[]>;
  /** label to render the entry under (e.g. a version or "Unreleased") */
  nextVersionLabel(): Promise<string>;
}

const FIELD_SEP = "\t";

/**
 * A git-backed commit provider. Lists commits since the most recent tag (or the
 * full history if there are no tags). Used in real runs; tests inject a fake.
 */
export function createGitCommitProvider(repoRoot: string): CommitProvider {
  async function git(args: string[]): Promise<string> {
    const { stdout } = await exec("git", args, { cwd: repoRoot });
    return stdout;
  }

  async function lastTag(): Promise<string | null> {
    try {
      return (await git(["describe", "--tags", "--abbrev=0"])).trim() || null;
    } catch {
      return null;
    }
  }

  return {
    async listUnreleased(): Promise<Commit[]> {
      const tag = await lastTag();
      const range = tag ? [`${tag}..HEAD`] : [];
      const out = await git(["log", "--no-merges", `--format=%h${FIELD_SEP}%s`, ...range]);
      return out
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const idx = line.indexOf(FIELD_SEP);
          const hash = idx >= 0 ? line.slice(0, idx) : line;
          const subject = idx >= 0 ? line.slice(idx + 1) : "";
          return { hash, subject };
        });
    },

    async nextVersionLabel(): Promise<string> {
      return "Unreleased";
    },
  };
}
