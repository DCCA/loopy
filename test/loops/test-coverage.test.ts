import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type FileChange, type RunContext } from "../../src/core/index.js";
import {
  createTestCoverageLoop,
  findGaps,
  type CoverageProvider,
  type TestGenerator,
  type Validator,
} from "../../loops/test-coverage/index.js";

const ctx: RunContext = { repoRoot: "/tmp/repo", logger: silentLogger };

describe("findGaps", () => {
  it("intersects changed lines with uncovered lines", () => {
    const gaps = findGaps(
      { "src/a.ts": [1, 2, 3], "src/b.ts": [10] },
      { "src/a.ts": [2, 3, 4], "src/c.ts": [5] },
    );
    expect(gaps).toEqual([{ file: "src/a.ts", lines: [2, 3] }]);
  });
});

const provider = (
  uncovered: Record<string, number[]>,
  changed: Record<string, number[]>,
): CoverageProvider => ({
  getUncovered: async () => uncovered,
  getChangedLines: async () => changed,
});

const generated: FileChange[] = [
  { path: "test/a.test.ts", op: "write", contents: "// test" },
];
const generatorOf =
  (changes: FileChange[]): TestGenerator =>
  async () =>
    changes;
const validatorOf =
  (passed: boolean, coverageRose: boolean): Validator =>
  async () => ({ passed, coverageRose });

const guardrails = { pathAllowlist: ["test/**"], maxFiles: 20 };
const trigger = { type: "manual" } as const;

describe("test-coverage loop", () => {
  it("opens a PR when tests are generated, pass, and raise coverage", async () => {
    const loop = createTestCoverageLoop(guardrails, trigger, {
      coverage: provider({ "src/a.ts": [2] }, { "src/a.ts": [2] }),
      generator: generatorOf(generated),
      validate: validatorOf(true, true),
    });
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("produced");
    expect(result.changes?.[0]?.path).toBe("test/a.test.ts");
  });

  it("produces no PR when validation fails (suite red or coverage flat)", async () => {
    const loop = createTestCoverageLoop(guardrails, trigger, {
      coverage: provider({ "src/a.ts": [2] }, { "src/a.ts": [2] }),
      generator: generatorOf(generated),
      validate: validatorOf(false, true),
    });
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("no-work");
  });

  it("produces no PR when there is no coverage gap", async () => {
    const loop = createTestCoverageLoop(guardrails, trigger, {
      coverage: provider({ "src/a.ts": [99] }, { "src/a.ts": [2] }),
      generator: generatorOf(generated),
      validate: validatorOf(true, true),
    });
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("no-work");
  });
});
