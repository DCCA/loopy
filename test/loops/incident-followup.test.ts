import { describe, expect, it } from "vitest";
import { runLoop, silentLogger, type RunContext } from "../../src/core/index.js";
import {
  createIncidentFollowupLoop,
  findOverdue,
  findRecurrences,
  normalizeCause,
  type IncidentFollowupConfig,
} from "../../loops/incident-followup/index.js";
import type {
  ActionItem,
  Incident,
  IncidentSource,
} from "../../loops/incident-followup/hooks/incidents.js";

const NOW = "2026-06-23T00:00:00.000Z";

describe("findOverdue", () => {
  const items: ActionItem[] = [
    { id: "a1", title: "Patch auth", incidentId: "i1", status: "open", dueIso: "2026-06-13T00:00:00.000Z" },
    { id: "a2", title: "Not yet due", incidentId: "i1", status: "open", dueIso: "2026-07-01T00:00:00.000Z" },
    { id: "a3", title: "Already done", incidentId: "i2", status: "done", dueIso: "2026-01-01T00:00:00.000Z" },
    { id: "a4", title: "No due date", incidentId: "i2", status: "open" },
    { id: "a5", title: "Long overdue", incidentId: "i3", status: "open", dueIso: "2026-05-24T00:00:00.000Z" },
  ];

  it("returns only open, past-due items sorted by daysOverdue desc", () => {
    const overdue = findOverdue(items, NOW);
    expect(overdue.map((o) => o.item.id)).toEqual(["a5", "a1"]);
    expect(overdue[0]?.daysOverdue).toBe(30);
    expect(overdue[1]?.daysOverdue).toBe(10);
  });

  it("excludes done, not-yet-due, and dateless items", () => {
    const overdue = findOverdue(items, NOW);
    const ids = overdue.map((o) => o.item.id);
    expect(ids).not.toContain("a2");
    expect(ids).not.toContain("a3");
    expect(ids).not.toContain("a4");
  });
});

describe("findRecurrences", () => {
  const incidents: Incident[] = [
    { id: "i1", title: "DB down", rootCause: "Connection  pool exhausted" },
    { id: "i2", title: "DB down again", rootCause: "connection pool exhausted" },
    { id: "i3", title: "Timeout", rootCause: "Slow query" },
    { id: "i4", title: "Mystery", rootCause: "connection pool exhausted" },
    { id: "i5", title: "Unknown cause" },
  ];

  it("groups by normalized cause and applies the threshold", () => {
    const recurrences = findRecurrences(incidents, 2);
    expect(recurrences).toHaveLength(1);
    expect(recurrences[0]?.rootCause).toBe("connection pool exhausted");
    expect(recurrences[0]?.count).toBe(3);
    expect(recurrences[0]?.incidentIds).toEqual(["i1", "i2", "i4"]);
  });

  it("skips incidents without a root cause", () => {
    const recurrences = findRecurrences(incidents, 1);
    const causes = recurrences.map((r) => r.rootCause);
    expect(causes).toContain("slow query");
    expect(recurrences.reduce((n, r) => n + r.count, 0)).toBe(4);
  });
});

describe("normalizeCause", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeCause("  Connection   Pool\tExhausted ")).toBe("connection pool exhausted");
  });
});

const config: IncidentFollowupConfig = {
  reportPath: "reports/incident-followup.md",
  minRecurrence: 2,
};

function source(incidents: Incident[], actionItems: ActionItem[]): IncidentSource {
  return {
    incidents: async () => incidents,
    actionItems: async () => actionItems,
  };
}

const ctx = (): RunContext => ({ repoRoot: "/tmp/loopy-incident", logger: silentLogger });

describe("incident-followup loop", () => {
  it("produces a digest when items are overdue or causes recur", async () => {
    const incidents: Incident[] = [
      { id: "i1", title: "DB down", rootCause: "connection pool exhausted" },
      { id: "i2", title: "DB down again", rootCause: "connection pool exhausted" },
    ];
    const items: ActionItem[] = [
      { id: "a1", title: "Patch auth", incidentId: "i1", status: "open", dueIso: "2026-06-13T00:00:00.000Z" },
    ];
    const loop = createIncidentFollowupLoop(
      config,
      { pathAllowlist: ["reports/**"], maxFiles: 5 },
      { type: "manual" },
      { incidents: source(incidents, items), now: () => new Date(NOW) },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("produced");
    const change = result.changes?.[0];
    expect(change?.path).toBe("reports/incident-followup.md");
    const contents = change && change.op === "write" ? change.contents : "";
    expect(contents).toContain("# Incident follow-up — 2026-06-23");
    expect(contents).toContain("connection pool exhausted");
    expect(contents).toContain("Patch auth");
  });

  it("reports no work when nothing is overdue and no cause recurs", async () => {
    const incidents: Incident[] = [{ id: "i1", title: "One-off", rootCause: "fluke" }];
    const items: ActionItem[] = [
      { id: "a1", title: "Done", incidentId: "i1", status: "done", dueIso: "2026-01-01T00:00:00.000Z" },
      { id: "a2", title: "Future", incidentId: "i1", status: "open", dueIso: "2026-12-01T00:00:00.000Z" },
    ];
    const loop = createIncidentFollowupLoop(
      config,
      { pathAllowlist: ["reports/**"], maxFiles: 5 },
      { type: "manual" },
      { incidents: source(incidents, items), now: () => new Date(NOW) },
    );

    const result = await runLoop(loop, ctx());
    expect(result.status).toBe("no-work");
  });
});
