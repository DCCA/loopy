import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createLicenseSbomLoop,
  type LicenseConfig,
} from "../../loops/license-sbom-drift/index.js";
import {
  classify,
  violations,
  type SbomEntry,
  type SbomSource,
} from "../../loops/license-sbom-drift/hooks/licenses.js";

function entry(name: string, license: string, version = "1.0.0"): SbomEntry {
  return { name, version, license };
}

function source(entries: SbomEntry[]): SbomSource {
  return { current: async () => entries };
}

const allowlist = ["MIT", "ISC", "Apache-2.0"];

const config: LicenseConfig = {
  reportPath: "reports/licenses.md",
  allowlist,
};

const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true };
const trigger = { type: "manual" as const };
const now = () => new Date("2026-06-23T07:00:00.000Z");
const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-license-sbom-drift", logger: silentLogger });

describe("classify", () => {
  it("marks an allowlisted license as allowed", () => {
    const [c] = classify([entry("a", "MIT")], allowlist);
    expect(c?.status).toBe("allowed");
  });

  it("marks a non-allowlisted license as denied", () => {
    const [c] = classify([entry("b", "GPL-3.0")], allowlist);
    expect(c?.status).toBe("denied");
  });

  it("marks an empty/unlicensed license as unknown", () => {
    expect(classify([entry("c", "")], allowlist)[0]?.status).toBe("unknown");
    expect(classify([entry("d", "UNKNOWN")], allowlist)[0]?.status).toBe("unknown");
    expect(classify([entry("e", "UNLICENSED")], allowlist)[0]?.status).toBe("unknown");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(classify([entry("f", " mit ")], allowlist)[0]?.status).toBe("allowed");
    expect(classify([entry("g", "apache-2.0")], allowlist)[0]?.status).toBe("allowed");
  });
});

describe("violations", () => {
  it("excludes allowed entries and sorts the rest by name", () => {
    const classified = classify(
      [entry("zlib-dep", "GPL-3.0"), entry("ok", "MIT"), entry("abc", "")],
      allowlist,
    );
    const v = violations(classified);
    expect(v.map((c) => c.entry.name)).toEqual(["abc", "zlib-dep"]);
    expect(v.every((c) => c.status !== "allowed")).toBe(true);
  });
});

describe("license-sbom-drift loop", () => {
  it("produces a PR writing the report when a GPL dep is present", async () => {
    const loop = createLicenseSbomLoop(config, guardrails, trigger, {
      sbom: source([entry("ok", "MIT"), entry("risky", "GPL-3.0")]),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/licenses.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("2026-06-23");
    expect(contents).toContain("risky");
    expect(contents).toContain("⚠ Review");
    expect(result.summary).toContain("risky");
    expect(result.summary).toContain("grant exceptions or replace deps");
  });

  it("reports no work when every license is allowed", async () => {
    const loop = createLicenseSbomLoop(config, guardrails, trigger, {
      sbom: source([entry("a", "MIT"), entry("b", "ISC")]),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
    expect(result.changes).toBeUndefined();
  });
});
