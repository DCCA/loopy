import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createReleaseTrainLoop,
  type ReleaseTrainConfig,
  type ReleaseSource,
  type Commit,
} from "../../loops/release-train/index.js";
import {
  computeBump,
  nextVersion,
} from "../../loops/release-train/hooks/release.js";

describe("computeBump", () => {
  it("returns minor for feat commits", () => {
    expect(computeBump([{ hash: "a1", subject: "feat: add thing" }])).toBe("minor");
  });
  it("returns patch for fix commits", () => {
    expect(computeBump([{ hash: "b2", subject: "fix: a bug" }])).toBe("patch");
  });
  it("returns major for breaking commits", () => {
    expect(computeBump([{ hash: "c3", subject: "feat!: drop legacy" }])).toBe("major");
  });
  it("returns null for an empty set", () => {
    expect(computeBump([])).toBeNull();
  });
});

describe("nextVersion", () => {
  it("applies each bump level", () => {
    expect(nextVersion("1.2.3", "major")).toBe("2.0.0");
    expect(nextVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.3", "patch")).toBe("1.2.4");
  });
  it("tolerates a leading v and drops it", () => {
    expect(nextVersion("v1.2.3", "patch")).toBe("1.2.4");
  });
  it("throws on an unparseable version", () => {
    expect(() => nextVersion("not-a-version", "patch")).toThrow();
  });
});

const config: ReleaseTrainConfig = {
  manifestPath: "package.json",
  changelogPath: "CHANGELOG.md",
};

function source(commits: Commit[], currentVersion = "1.2.3"): ReleaseSource {
  return {
    unreleased: async () => commits,
    currentVersion: async () => currentVersion,
  };
}

let repo: string;
beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "loopy-release-train-"));
  await writeFile(
    join(repo, "package.json"),
    JSON.stringify({ name: "x", version: "1.2.3" }, null, 2),
  );
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

const ctx = (): RunContext => ({ repoRoot: repo, logger: silentLogger });
const fixedNow = () => new Date("2026-06-21T00:00:00Z");

describe("release-train loop", () => {
  it("opens a Release PR bumping the version and writing changelog notes", async () => {
    const loop = createReleaseTrainLoop(
      config,
      { pathAllowlist: ["package.json", "CHANGELOG.md"], maxFiles: 2 },
      { type: "manual" },
      { source: source([{ hash: "a1", subject: "feat: shiny" }]), now: fixedNow },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");

    const manifestChange = result.changes?.find((c) => c.path === "package.json");
    const changelogChange = result.changes?.find((c) => c.path === "CHANGELOG.md");

    const manifestContents =
      manifestChange && manifestChange.op === "write" ? manifestChange.contents : "{}";
    const manifest = JSON.parse(manifestContents);
    expect(manifest.version).toBe("1.3.0");

    const changelogContents =
      changelogChange && changelogChange.op === "write" ? changelogChange.contents : "";
    expect(changelogContents).toContain("# Changelog");
    expect(changelogContents).toContain("## 1.3.0 - 2026-06-21");
    expect(changelogContents).toContain("shiny");

    expect(result.summary).toContain("Merge to cut the release");
  });

  it("reports no work when there are no releasable commits", async () => {
    const loop = createReleaseTrainLoop(
      config,
      { pathAllowlist: ["package.json", "CHANGELOG.md"], maxFiles: 2 },
      { type: "manual" },
      { source: source([]), now: fixedNow },
    );
    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });

  it("leaves the manifest untouched on disk (output is a change set)", async () => {
    const loop = createReleaseTrainLoop(
      config,
      { pathAllowlist: ["package.json", "CHANGELOG.md"], maxFiles: 2 },
      { type: "manual" },
      { source: source([{ hash: "a1", subject: "fix: patch it" }]), now: fixedNow },
    );
    await runLoop(loop, ctx());
    const onDisk = JSON.parse(await readFile(join(repo, "package.json"), "utf8"));
    expect(onDisk.version).toBe("1.2.3");
  });
});
