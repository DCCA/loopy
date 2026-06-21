import { describe, expect, it } from "vitest";
import { enforceGuardrails, GuardrailViolation, type FileChange } from "../../src/core/index.js";

const write = (path: string): FileChange => ({ path, op: "write", contents: "x" });

describe("enforceGuardrails", () => {
  it("passes when all paths are allowlisted and under the cap", () => {
    expect(() =>
      enforceGuardrails([write("README.md"), write("docs/a.md")], {
        pathAllowlist: ["README.md", "docs/**"],
        maxFiles: 5,
      }),
    ).not.toThrow();
  });

  it("rejects paths outside the allowlist", () => {
    expect(() =>
      enforceGuardrails([write("src/secret.ts")], { pathAllowlist: ["docs/**"] }),
    ).toThrow(GuardrailViolation);
  });

  it("rejects change sets larger than maxFiles", () => {
    const changes = [write("docs/a.md"), write("docs/b.md"), write("docs/c.md")];
    expect(() => enforceGuardrails(changes, { maxFiles: 2 })).toThrow(GuardrailViolation);
  });

  it("is a no-op when no guardrails are configured", () => {
    expect(() => enforceGuardrails([write("anything/at/all.ts")], {})).not.toThrow();
  });
});
