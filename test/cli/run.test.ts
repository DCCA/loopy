import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../../src/cli/commands/run.js";
import { main } from "../../src/cli/index.js";
import { silentLogger } from "../../src/core/index.js";
import type { GitHubClient } from "../../src/adapters/github-action/index.js";
import type { RegistryClient } from "../../loops/dep-updates/index.js";
import type { AiClient } from "../../src/ai/index.js";
import type { DiffProvider } from "../../loops/pr-review/index.js";

// The bundled loops live at <repo>/loops during tests.
const LOOPS_DIR = join(process.cwd(), "loops");

function fakeClient(): GitHubClient {
  return {
    hasOpenLoopPr: vi.fn(async () => false),
    createPullRequest: vi.fn(async () => ({ number: 5, url: "https://gh/pr/5" })),
    postComment: vi.fn(async () => ({ url: "https://gh/pr/5#c" })),
  };
}

const registry = (latest: Record<string, string>): RegistryClient => ({
  getLatest: async (pkg) => latest[pkg] ?? null,
});

let repo: string;
beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "loopy-run-"));
});
afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe("loopy run", () => {
  it("runs the dep-updates loop end-to-end and opens a PR", async () => {
    await writeFile(
      join(repo, "package.json"),
      JSON.stringify({ name: "x", dependencies: { left: "^1.0.0" } }, null, 2),
    );
    const client = fakeClient();
    const outcome = await run("dep-updates", {
      cwd: repo,
      loopsDir: LOOPS_DIR,
      client,
      registry: registry({ left: "1.2.0" }),
      logger: silentLogger,
    });
    expect(outcome.ran).toBe(true);
    expect(outcome.publish?.status).toBe("published");
    expect(client.createPullRequest).toHaveBeenCalledOnce();
  });

  it("reports guidance for auto-docs when no AI key is set", async () => {
    const outcome = await run("auto-docs", { cwd: repo, logger: silentLogger, env: {} });
    expect(outcome.ran).toBe(false);
    expect(outcome.message).toMatch(/needs an AI provider/);
    expect(outcome.message).toMatch(/OPENROUTER_API_KEY/);
  });

  it("runs auto-docs end-to-end with an injected AI client", async () => {
    await writeFile(join(repo, "README.md"), "# x\nold\n");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(repo, "src"), { recursive: true });
    await writeFile(join(repo, "src", "a.ts"), "export const v = 1;\n");

    const aiClient: AiClient = {
      model: "test",
      complete: async () => JSON.stringify([{ path: "README.md", contents: "# x\nnew\n" }]),
    };
    const client = fakeClient();
    const outcome = await run("auto-docs", {
      cwd: repo,
      loopsDir: LOOPS_DIR,
      client,
      aiClient,
      logger: silentLogger,
      env: {},
    });
    expect(outcome.ran).toBe(true);
    expect(outcome.publish?.status).toBe("published");
  });

  it("runs pr-review end-to-end and posts a comment", async () => {
    const diffProvider: DiffProvider = {
      getDiff: async () => ({ files: [{ path: "src/a.ts", patch: "@@ +x" }] }),
    };
    const aiClient: AiClient = {
      model: "test",
      complete: async () => JSON.stringify({ summary: "looks fine", issues: [] }),
    };
    const client = fakeClient();
    const outcome = await run("pr-review", {
      cwd: repo,
      loopsDir: LOOPS_DIR,
      client,
      aiClient,
      diffProvider,
      prNumber: 12,
      logger: silentLogger,
      env: {},
    });
    expect(outcome.ran).toBe(true);
    expect(outcome.publish?.status).toBe("commented");
    expect(client.postComment).toHaveBeenCalledOnce();
  });

  it("guides when pr-review has an AI key but no PR number", async () => {
    const aiClient: AiClient = { model: "t", complete: async () => "{}" };
    const outcome = await run("pr-review", {
      cwd: repo,
      loopsDir: LOOPS_DIR,
      aiClient,
      logger: silentLogger,
      env: {},
    });
    expect(outcome.ran).toBe(false);
    expect(outcome.message).toMatch(/PR number/);
  });
});

describe("main()", () => {
  it("prints help and exits 0 for `help`", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["help"])).toBe(0);
    log.mockRestore();
  });

  it("exits 1 for an unknown command", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["frobnicate"])).toBe(1);
    err.mockRestore();
  });

  it("lists loops and exits 0", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["list"])).toBe(0);
    log.mockRestore();
  });
});
