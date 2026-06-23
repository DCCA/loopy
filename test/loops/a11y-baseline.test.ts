import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createA11yBaselineLoop,
  type A11yConfig,
} from "../../loops/a11y-baseline/index.js";
import {
  fixedViolations,
  newViolations,
  violationKey,
  type A11yScanner,
  type Violation,
} from "../../loops/a11y-baseline/hooks/a11y.js";

function v(id: string, selector: string, impact?: string): Violation {
  return impact === undefined ? { id, selector } : { id, selector, impact };
}

function scanner(violations: Violation[]): A11yScanner {
  return { scan: async () => violations };
}

function baseline(violations: Violation[]): () => Promise<Violation[]> {
  return async () => violations;
}

const config: A11yConfig = { reportPath: "reports/a11y.md" };
const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true };
const trigger = { type: "event" as const, events: ["pull_request"] };
const now = () => new Date("2026-06-23T07:00:00.000Z");
const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-a11y-baseline", logger: silentLogger });

describe("violationKey", () => {
  it("joins id and selector with @", () => {
    expect(violationKey(v("color-contrast", ".btn"))).toBe("color-contrast@.btn");
  });
});

describe("newViolations", () => {
  it("returns current violations not in the baseline, sorted by key", () => {
    const current = [v("aria-label", "#x"), v("color-contrast", ".btn"), v("image-alt", "img")];
    const base = [v("color-contrast", ".btn")];
    const news = newViolations(current, base);
    expect(news.map(violationKey)).toEqual(["aria-label@#x", "image-alt@img"]);
  });

  it("is empty when every current violation is in the baseline", () => {
    const current = [v("color-contrast", ".btn")];
    const base = [v("color-contrast", ".btn"), v("aria-label", "#x")];
    expect(newViolations(current, base)).toEqual([]);
  });
});

describe("fixedViolations", () => {
  it("returns baseline violations no longer present, sorted by key", () => {
    const current = [v("color-contrast", ".btn")];
    const base = [v("image-alt", "img"), v("color-contrast", ".btn"), v("aria-label", "#x")];
    const fixed = fixedViolations(current, base);
    expect(fixed.map(violationKey)).toEqual(["aria-label@#x", "image-alt@img"]);
  });
});

describe("a11y-baseline loop", () => {
  it("produces a PR writing the report when a new violation appears", async () => {
    const loop = createA11yBaselineLoop(config, guardrails, trigger, {
      scanner: scanner([v("color-contrast", ".btn", "serious"), v("image-alt", "img", "critical")]),
      readBaseline: baseline([v("color-contrast", ".btn")]),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/a11y.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("2026-06-23");
    expect(contents).toContain("image-alt");
    expect(contents).toContain("New violations");
    expect(result.summary).toContain("image-alt@img");
    expect(result.summary).toContain("growing the baseline");
  });

  it("reports no work when only baseline violations are present", async () => {
    const loop = createA11yBaselineLoop(config, guardrails, trigger, {
      scanner: scanner([v("color-contrast", ".btn")]),
      readBaseline: baseline([v("color-contrast", ".btn"), v("aria-label", "#x")]),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
    expect(result.changes).toBeUndefined();
  });
});
