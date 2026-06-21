import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { add } from "../../src/cli/commands/add.js";
import { renderList } from "../../src/cli/commands/list.js";
import { renderWorkflow } from "../../src/cli/template.js";
import { getEntry } from "../../src/cli/catalog.js";

let repo: string;
beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "loopy-cli-"));
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe("loopy add", () => {
  it("scaffolds a ready-to-run workflow for a schedule loop", async () => {
    const result = await add("dep-updates", { cwd: repo });
    expect(result.path).toBe(".github/workflows/loopy-dep-updates.yml");
    const content = await readFile(join(repo, result.path), "utf8");
    expect(content).toContain("name: loopy dep-updates");
    expect(content).toContain("schedule:");
    expect(content).toContain("workflow_dispatch: {}");
    expect(content).toContain("npx -y loopy run dep-updates");
    expect(content).toContain("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    expect(content).not.toContain("ANTHROPIC_API_KEY");
  });

  it("uses the PR event trigger and comment permissions for pr-review", async () => {
    const result = await add("pr-review", { cwd: repo });
    const content = await readFile(join(repo, result.path), "utf8");
    expect(content).toContain("  pull_request:");
    expect(content).toContain("pull-requests: write");
    expect(content).toContain("ANTHROPIC_API_KEY");
  });

  it("rejects an unknown loop with guidance", async () => {
    await expect(add("nope", { cwd: repo })).rejects.toThrow(/unknown loop "nope"/);
  });
});

describe("loopy list", () => {
  it("lists every catalog loop", () => {
    const out = renderList();
    expect(out).toContain("dep-updates");
    expect(out).toContain("security-remediation");
    expect(out).toContain("loopy add <loop>");
  });
});

describe("renderWorkflow", () => {
  it("matches the loop's output channel in permissions", () => {
    const prReview = renderWorkflow(getEntry("pr-review")!);
    expect(prReview).toContain("pull-requests: write");
    const depUpdates = renderWorkflow(getEntry("dep-updates")!);
    expect(depUpdates).toContain("contents: write");
  });
});
