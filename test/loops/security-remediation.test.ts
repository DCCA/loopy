import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type FileChange, type RunContext } from "../../src/core/index.js";
import {
  createSecurityRemediationLoop,
  filterActionable,
  meetsThreshold,
  type Finding,
  type FindingsProvider,
  type Fixer,
} from "../../loops/security-remediation/index.js";

const ctx: RunContext = { repoRoot: "/tmp/repo", logger: silentLogger };

describe("severity filtering", () => {
  it("ranks severities", () => {
    expect(meetsThreshold("high", "high")).toBe(true);
    expect(meetsThreshold("critical", "high")).toBe(true);
    expect(meetsThreshold("medium", "high")).toBe(false);
  });

  it("excludes false positives and below-threshold findings", () => {
    const findings: Finding[] = [
      { id: "a", severity: "critical", title: "x" },
      { id: "b", severity: "low", title: "y" },
      { id: "c", severity: "high", title: "z", falsePositive: true },
    ];
    expect(filterActionable(findings, "high").map((f) => f.id)).toEqual(["a"]);
  });
});

const providerOf = (findings: Finding[]): FindingsProvider => ({ list: async () => findings });
const fix: FileChange[] = [{ path: "package.json", op: "write", contents: "{}" }];
const guardrails = { pathAllowlist: ["package.json", "src/**"], maxFiles: 25 };
const trigger = { type: "manual" } as const;

describe("security-remediation loop", () => {
  it("opens a human-gated PR for actionable findings with a fix", async () => {
    const fixer: Fixer = async () => fix;
    const loop = createSecurityRemediationLoop(
      { severityThreshold: "high" },
      guardrails,
      trigger,
      { findings: providerOf([{ id: "a", severity: "critical", title: "RCE", package: "left" }]), fixer },
    );
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("produced");
    expect(result.changes?.[0]?.path).toBe("package.json");
    expect(result.summary).toContain("never auto-merge");
  });

  it("produces no PR when only below-threshold findings exist", async () => {
    const fixer: Fixer = async () => fix;
    const loop = createSecurityRemediationLoop(
      { severityThreshold: "high" },
      guardrails,
      trigger,
      { findings: providerOf([{ id: "b", severity: "medium", title: "minor" }]), fixer },
    );
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("no-work");
  });

  it("produces no PR when no fix is available", async () => {
    const fixer: Fixer = async () => [];
    const loop = createSecurityRemediationLoop(
      { severityThreshold: "high" },
      guardrails,
      trigger,
      { findings: providerOf([{ id: "a", severity: "high", title: "x" }]), fixer },
    );
    const result = await runLoop(loop, ctx);
    expect(result.status).toBe("no-work");
  });
});
