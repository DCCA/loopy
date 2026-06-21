import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createDepUpdatesLoop,
  type DepUpdatesConfig,
  type RegistryClient,
} from "../../loops/dep-updates/index.js";
import {
  parseRange,
  updateType,
  formatRange,
} from "../../loops/dep-updates/hooks/semver.js";

describe("semver helpers", () => {
  it("parses ranges with prefixes", () => {
    expect(parseRange("^1.2.3")).toEqual({ prefix: "^", version: { major: 1, minor: 2, patch: 3 } });
    expect(parseRange("~0.4.0")).toEqual({ prefix: "~", version: { major: 0, minor: 4, patch: 0 } });
    expect(parseRange("2.0.0")).toEqual({ prefix: "", version: { major: 2, minor: 0, patch: 0 } });
    expect(parseRange("workspace:*")).toBeNull();
  });

  it("classifies update type", () => {
    const v = (s: string) => parseRange(s)!.version;
    expect(updateType(v("1.2.3"), v("1.2.4"))).toBe("patch");
    expect(updateType(v("1.2.3"), v("1.3.0"))).toBe("minor");
    expect(updateType(v("1.2.3"), v("2.0.0"))).toBe("major");
    expect(updateType(v("1.2.3"), v("1.2.3"))).toBeNull();
  });

  it("formats a range keeping the prefix", () => {
    expect(formatRange("^", { major: 1, minor: 5, patch: 0 })).toBe("^1.5.0");
  });
});

const config: DepUpdatesConfig = {
  manifestPath: "package.json",
  includeDev: true,
  allowMajor: false,
};

function registry(latest: Record<string, string>): RegistryClient {
  return { getLatest: async (pkg) => latest[pkg] ?? null };
}

let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "loopy-dep-updates-"));
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

const ctx = (): RunContext => ({ repoRoot: repo, logger: silentLogger });

async function writeManifest(manifest: unknown): Promise<void> {
  await writeFile(join(repo, "package.json"), JSON.stringify(manifest, null, 2));
}

describe("dep-updates loop", () => {
  it("opens a PR bumping non-major updates, preserving prefixes", async () => {
    await writeManifest({
      name: "x",
      dependencies: { left: "^1.2.3" },
      devDependencies: { right: "~2.0.0" },
    });
    const loop = createDepUpdatesLoop(
      config,
      { pathAllowlist: ["package.json"], maxFiles: 1 },
      { type: "manual" },
      { registry: registry({ left: "1.4.0", right: "2.0.5" }) },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.[0];
    expect(change?.path).toBe("package.json");
    const updated = JSON.parse(change && change.op === "write" ? change.contents : "{}");
    expect(updated.dependencies.left).toBe("^1.4.0");
    expect(updated.devDependencies.right).toBe("~2.0.5");
    expect(result.summary).toContain("left");
  });

  it("excludes major updates by default and reports no work when only majors exist", async () => {
    await writeManifest({ name: "x", dependencies: { big: "^1.0.0" } });
    const loop = createDepUpdatesLoop(
      config,
      { pathAllowlist: ["package.json"], maxFiles: 1 },
      { type: "manual" },
      { registry: registry({ big: "2.0.0" }) },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
    expect(result.reason).toMatch(/major/);
  });

  it("produces no PR when everything is up to date", async () => {
    await writeManifest({ name: "x", dependencies: { ok: "^1.0.0" } });
    const loop = createDepUpdatesLoop(
      config,
      { pathAllowlist: ["package.json"], maxFiles: 1 },
      { type: "manual" },
      { registry: registry({ ok: "1.0.0" }) },
    );
    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });

  it("leaves the manifest untouched on disk (output is a change set, not a write)", async () => {
    await writeManifest({ name: "x", dependencies: { left: "^1.2.3" } });
    const loop = createDepUpdatesLoop(
      config,
      { pathAllowlist: ["package.json"], maxFiles: 1 },
      { type: "manual" },
      { registry: registry({ left: "1.4.0" }) },
    );
    await runLoop(loop, ctx());
    const onDisk = JSON.parse(await readFile(join(repo, "package.json"), "utf8"));
    expect(onDisk.dependencies.left).toBe("^1.2.3");
  });
});
