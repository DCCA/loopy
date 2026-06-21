import { describe, expect, it } from "vitest";
import { parseManifest } from "../../src/core/index.js";

const valid = `
id: auto-docs
trigger:
  type: schedule
  cron: "0 6 * * 1"
guardrails:
  pathAllowlist:
    - "README.md"
    - "docs/**"
  maxFiles: 25
  skipIfOpenPr: true
config:
  codeSurface:
    - "src/**/*.ts"
  markerPath: "docs/.loopy-auto-docs.json"
`;

describe("parseManifest", () => {
  it("parses a valid manifest", () => {
    const m = parseManifest(valid);
    expect(m.id).toBe("auto-docs");
    expect(m.trigger).toEqual({ type: "schedule", cron: "0 6 * * 1" });
    expect(m.guardrails).toEqual({
      pathAllowlist: ["README.md", "docs/**"],
      maxFiles: 25,
      skipIfOpenPr: true,
    });
    expect(m.config["markerPath"]).toBe("docs/.loopy-auto-docs.json");
  });

  it("rejects a manifest without an id", () => {
    expect(() => parseManifest("trigger:\n  type: manual\n")).toThrow(/id/);
  });

  it("rejects an invalid trigger type", () => {
    expect(() => parseManifest("id: x\ntrigger:\n  type: nope\n")).toThrow(/trigger\.type/);
  });
});
