import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createMetricAnomalyLoop,
  type MetricAnomalyConfig,
} from "../../loops/metric-anomaly/index.js";
import {
  detectAnomalies,
  type MetricSeries,
  type MetricSource,
} from "../../loops/metric-anomaly/hooks/anomaly.js";

function series(name: string, values: number[]): MetricSeries {
  return {
    name,
    points: values.map((value, i) => ({ t: `2026-06-${String(i + 1).padStart(2, "0")}`, value })),
  };
}

function source(all: MetricSeries[]): MetricSource {
  return { series: async () => all };
}

const config: MetricAnomalyConfig = {
  reportPath: "reports/anomalies.md",
  zThreshold: 3,
};

const guardrails = { pathAllowlist: ["reports/**"], maxFiles: 5, skipIfOpenPr: true };
const trigger = { type: "manual" as const };
const now = () => new Date("2026-06-23T07:00:00.000Z");
const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-metric-anomaly", logger: silentLogger });

describe("detectAnomalies", () => {
  it("flags a clear spike against a flat-ish baseline", () => {
    const anomalies = detectAnomalies([series("cpu", [10, 10, 11, 10, 100])], 3);
    expect(anomalies).toHaveLength(1);
    const a = anomalies[0]!;
    expect(a.metric).toBe("cpu");
    expect(a.direction).toBe("up");
    expect(a.value).toBe(100);
    expect(Math.abs(a.z)).toBeGreaterThanOrEqual(3);
  });

  it("flags a downward spike", () => {
    const anomalies = detectAnomalies([series("orders", [100, 101, 99, 100, 0])], 3);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]!.direction).toBe("down");
  });

  it("returns nothing for a flat series (std == 0)", () => {
    expect(detectAnomalies([series("flat", [5, 5, 5, 5])], 3)).toEqual([]);
  });

  it("returns nothing for a gentle series under threshold", () => {
    expect(detectAnomalies([series("gentle", [10, 11, 12, 13, 14])], 3)).toEqual([]);
  });

  it("skips series with fewer than 3 points", () => {
    expect(detectAnomalies([series("short", [1, 100])], 3)).toEqual([]);
  });

  it("sorts results by |z| descending", () => {
    const anomalies = detectAnomalies(
      [series("small", [10, 10, 11, 10, 40]), series("big", [10, 10, 11, 10, 200])],
      3,
    );
    expect(anomalies.map((a) => a.metric)).toEqual(["big", "small"]);
  });
});

describe("metric-anomaly loop", () => {
  it("produces a PR writing the brief when an anomaly exists", async () => {
    const loop = createMetricAnomalyLoop(config, guardrails, trigger, {
      metrics: source([series("cpu", [10, 10, 11, 10, 100])]),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    expect(result.outputKind).toBe("pull-request");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/anomalies.md");
    expect(change?.op).toBe("write");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("2026-06-23");
    expect(contents).toContain("cpu");
    expect(result.summary).toContain("cpu");
    expect(result.summary).toContain("metrics can be noisy");
  });

  it("reports no work when there are no anomalies", async () => {
    const loop = createMetricAnomalyLoop(config, guardrails, trigger, {
      metrics: source([series("flat", [5, 5, 5, 5]), series("gentle", [10, 11, 12, 13])]),
      now,
    });

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
    expect(result.changes).toBeUndefined();
  });
});
