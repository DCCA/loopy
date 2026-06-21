import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createChangelogLoop,
  type ChangelogConfig,
  type CommitProvider,
  type Commit,
} from "../../loops/changelog/index.js";
import {
  parseConventional,
  renderChangelogEntry,
} from "../../loops/changelog/hooks/conventional.js";

describe("conventional commit parsing", () => {
  it("parses type, scope, subject and breaking flag", () => {
    expect(parseConventional({ hash: "a1", subject: "feat(api): add search" })).toEqual({
      type: "feat",
      scope: "api",
      subject: "add search",
      hash: "a1",
      breaking: false,
    });
    expect(parseConventional({ hash: "b2", subject: "fix!: drop legacy flag" })).toMatchObject({
      type: "fix",
      breaking: true,
    });
  });

  it("falls back to type 'other' for non-conventional subjects", () => {
    expect(parseConventional({ hash: "c3", subject: "random message" }).type).toBe("other");
  });
});

describe("renderChangelogEntry", () => {
  it("groups commits into sections", () => {
    const entry = renderChangelogEntry("1.1.0", "2026-06-21", [
      { hash: "a1", subject: "feat: a" },
      { hash: "b2", subject: "fix: b" },
      { hash: "c3", subject: "feat(ui): c" },
    ]);
    expect(entry).toContain("## 1.1.0 - 2026-06-21");
    expect(entry).toContain("### Features");
    expect(entry).toContain("### Bug Fixes");
    expect(entry.indexOf("### Features")).toBeLessThan(entry.indexOf("### Bug Fixes"));
  });
});

const config: ChangelogConfig = { changelogPath: "CHANGELOG.md" };

function provider(commits: Commit[], label = "Unreleased"): CommitProvider {
  return {
    listUnreleased: async () => commits,
    nextVersionLabel: async () => label,
  };
}

let repo: string;
beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "loopy-changelog-"));
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

const ctx = (): RunContext => ({ repoRoot: repo, logger: silentLogger });
const fixedNow = () => new Date("2026-06-21T00:00:00Z");

describe("changelog loop", () => {
  it("creates a changelog when none exists", async () => {
    const loop = createChangelogLoop(
      config,
      { pathAllowlist: ["CHANGELOG.md"], maxFiles: 1 },
      { type: "manual" },
      { commits: provider([{ hash: "a1", subject: "feat: first" }]), now: fixedNow },
    );
    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.[0];
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("# Changelog");
    expect(contents).toContain("## Unreleased - 2026-06-21");
    expect(contents).toContain("feat".length ? "first" : "");
  });

  it("prepends to an existing changelog, preserving prior entries", async () => {
    await writeFile(
      join(repo, "CHANGELOG.md"),
      "# Changelog\n\n## 1.0.0 - 2026-01-01\n\n### Features\n\n- old (`old1`)\n",
    );
    const loop = createChangelogLoop(
      config,
      { pathAllowlist: ["CHANGELOG.md"], maxFiles: 1 },
      { type: "manual" },
      { commits: provider([{ hash: "n1", subject: "fix: new thing" }]), now: fixedNow },
    );
    const result = await runLoop(loop, ctx());
    const change = result.changes?.[0];
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("new thing");
    expect(contents).toContain("## 1.0.0 - 2026-01-01");
    expect(contents.indexOf("new thing")).toBeLessThan(contents.indexOf("old ("));
  });

  it("produces no PR when there are no unreleased commits", async () => {
    const loop = createChangelogLoop(
      config,
      { pathAllowlist: ["CHANGELOG.md"], maxFiles: 1 },
      { type: "manual" },
      { commits: provider([]), now: fixedNow },
    );
    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });
});
