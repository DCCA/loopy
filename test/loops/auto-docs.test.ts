import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createAutoDocsLoop,
  type AutoDocsConfig,
  type DocChange,
  type DocWriter,
} from "../../loops/auto-docs/index.js";

const config: AutoDocsConfig = {
  codeSurface: ["src/**/*.ts"],
  docTargets: ["README.md", "docs/**/*.md"],
  markerPath: "docs/.loopy-auto-docs.json",
};

let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "loopy-auto-docs-"));
  await mkdir(join(repo, "src"), { recursive: true });
  await mkdir(join(repo, "docs"), { recursive: true });
  await writeFile(join(repo, "src/api.ts"), "export const version = 1;\n");
  await writeFile(join(repo, "README.md"), "# project\nversion 1\n");
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

const ctx = (): RunContext => ({ repoRoot: repo, logger: silentLogger });

/** A fake AI doc-writer that returns canned doc edits. */
const writerOf =
  (changes: DocChange[]): DocWriter =>
  async () =>
    changes;

describe("auto-docs loop", () => {
  it("detects work on first run (no marker) and writes a marker via the runner", async () => {
    const docWriter = writerOf([
      { path: "README.md", contents: "# project\nversion 1 (documented)\n" },
    ]);
    const loop = createAutoDocsLoop(config, { pathAllowlist: ["README.md", "docs/**"] }, { type: "manual" }, { docWriter });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const paths = (result.changes ?? []).map((c) => c.path).sort();
    expect(paths).toEqual(["README.md", "docs/.loopy-auto-docs.json"]);
  });

  it("is idempotent: after the marker is written, an unchanged surface is no-work", async () => {
    const docWriter: DocWriter = async () => [
      { path: "README.md", contents: "# project\nversion 1\n" },
    ];
    const loop = createAutoDocsLoop(config, { pathAllowlist: ["README.md", "docs/**"] }, { type: "manual" }, { docWriter });

    // First run produces changes; apply the marker to disk to simulate the merged PR.
    const first = await runLoop(loop, ctx());
    expect(first.status).toBe("produced");
    const marker = (first.changes ?? []).find((c) => c.path === config.markerPath);
    expect(marker && marker.op === "write").toBe(true);
    if (marker && marker.op === "write") {
      await writeFile(join(repo, config.markerPath), marker.contents);
    }

    // Second run with no code change => no work.
    const second = await runLoop(loop, ctx());
    expect(second.status).toBe("no-work");
    expect(second.reason).toMatch(/unchanged/);
  });

  it("detects drift after the code surface changes", async () => {
    const docWriter: DocWriter = async () => [
      { path: "README.md", contents: "# project\nupdated\n" },
    ];
    const loop = createAutoDocsLoop(config, { pathAllowlist: ["README.md", "docs/**"] }, { type: "manual" }, { docWriter });

    const first = await runLoop(loop, ctx());
    const marker = (first.changes ?? []).find((c) => c.path === config.markerPath);
    if (marker && marker.op === "write") {
      await writeFile(join(repo, config.markerPath), marker.contents);
    }

    // Change the code surface.
    await writeFile(join(repo, "src/api.ts"), "export const version = 2;\n");

    const second = await runLoop(loop, ctx());
    expect(second.status).toBe("produced");
  });

  it("fails safe when the doc-writer goes outside the allowlist", async () => {
    const docWriter: DocWriter = async () => [
      { path: "src/sneaky.ts", contents: "malicious" },
    ];
    const loop = createAutoDocsLoop(config, { pathAllowlist: ["README.md", "docs/**"] }, { type: "manual" }, { docWriter });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("failed");
    expect(result.error?.name).toBe("GuardrailViolation");
    // Nothing was written to disk.
    await expect(readFile(join(repo, config.markerPath), "utf8")).rejects.toThrow();
  });
});
