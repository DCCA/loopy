import { describe, expect, it } from "vitest";
import {
  runLoop,
  silentLogger,
  type Loop,
  type RunContext,
  type FileChange,
} from "../../src/core/index.js";

const ctx: RunContext = { repoRoot: "/tmp/repo", logger: silentLogger };

function loop(overrides: Partial<Loop> & Pick<Loop, "detect" | "act">): Loop {
  return {
    id: "test-loop",
    trigger: { type: "manual" },
    guardrails: {},
    ...overrides,
  };
}

const oneChange: FileChange[] = [{ path: "docs/a.md", op: "write", contents: "hi" }];

describe("runLoop", () => {
  it("returns no-work when detect reports nothing to do", async () => {
    const result = await runLoop(
      loop({
        detect: async () => ({ workNeeded: false, reason: "nothing changed" }),
        act: async () => ({ changes: oneChange, summary: "" }),
      }),
      ctx,
    );
    expect(result.status).toBe("no-work");
    expect(result.reason).toBe("nothing changed");
  });

  it("returns produced with the change set when work is done", async () => {
    const result = await runLoop(
      loop({
        detect: async () => ({ workNeeded: true }),
        act: async () => ({ changes: oneChange, summary: "did it" }),
      }),
      ctx,
    );
    expect(result.status).toBe("produced");
    expect(result.changes).toEqual(oneChange);
    expect(result.summary).toBe("did it");
  });

  it("treats an empty change set as no-work", async () => {
    const result = await runLoop(
      loop({
        detect: async () => ({ workNeeded: true }),
        act: async () => ({ changes: [], summary: "" }),
      }),
      ctx,
    );
    expect(result.status).toBe("no-work");
  });

  it("fails safe on a guardrail violation (no output)", async () => {
    const result = await runLoop(
      loop({
        guardrails: { pathAllowlist: ["docs/**"] },
        detect: async () => ({ workNeeded: true }),
        act: async () => ({
          changes: [{ path: "src/leak.ts", op: "write", contents: "x" }],
          summary: "",
        }),
      }),
      ctx,
    );
    expect(result.status).toBe("failed");
    expect(result.changes).toBeUndefined();
    expect(result.error?.name).toBe("GuardrailViolation");
  });

  it("fails safe when a phase throws", async () => {
    const result = await runLoop(
      loop({
        detect: async () => {
          throw new Error("boom");
        },
        act: async () => ({ changes: oneChange, summary: "" }),
      }),
      ctx,
    );
    expect(result.status).toBe("failed");
    expect(result.error?.message).toBe("boom");
  });
});
