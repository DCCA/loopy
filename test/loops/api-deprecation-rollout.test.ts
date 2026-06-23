import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore, type StateStore } from "../../src/core/index.js";
import {
  advanceApiDeprecation,
  renderDeprecationNotice,
  renderRemovalNote,
  type ApiDeprecationServices,
  type ApiDeprecationSpec,
} from "../../loops/api-deprecation-rollout/index.js";

const spec: ApiDeprecationSpec = {
  api: "v1.users.list",
  noticePath: "docs/deprecations/v1-users-list.md",
  removalPath: "docs/deprecations/v1-users-list-removed.md",
  graceUntilIso: "2026-12-01T00:00:00.000Z",
};

/** Services whose caller count is a mutable box, so the drain can be simulated. */
const callersOf = (box: { count: number }): ApiDeprecationServices => ({
  remainingCallers: async () => box.count,
});

const clock = (iso: string) => () => new Date(iso);

const planId = "v1-users-list";

describe("api-deprecation-rollout", () => {
  it("waits out the grace period, drains callers, gates removal, then removes on approval", async () => {
    const store: StateStore = createMemoryStateStore();
    const box = { count: 3 };
    const services = callersOf(box);

    // Before the grace deadline: announce ran, but we pause at grace-period.
    let r = await advanceApiDeprecation(planId, spec, services, store, {
      now: clock("2026-06-23T00:00:00.000Z"),
    });
    expect(r.status).toBe("waiting");
    expect(r.currentStep).toBe("grace-period");
    expect(r.notice?.[0]?.path).toBe(spec.noticePath);
    expect(r.removal).toBeUndefined();

    // After the deadline but callers still present: pause at verify-callers.
    r = await advanceApiDeprecation(planId, spec, services, store, {
      now: clock("2026-12-02T00:00:00.000Z"),
    });
    expect(r.status).toBe("waiting");
    expect(r.currentStep).toBe("verify-callers");
    expect(r.removal).toBeUndefined();

    // Callers drained, gate still pending: pause blocked at the removal gate.
    box.count = 0;
    r = await advanceApiDeprecation(planId, spec, services, store, {
      now: clock("2026-12-03T00:00:00.000Z"),
    });
    expect(r.status).toBe("blocked");
    expect(r.blockedGateId).toBe(`${planId}:approve-removal`);
    expect(r.removal).toBeUndefined();

    // Approve, then the next advance completes and emits the removal change set.
    await createGate(store).decide(`${planId}:approve-removal`, "approved");
    r = await advanceApiDeprecation(planId, spec, services, store, {
      now: clock("2026-12-04T00:00:00.000Z"),
    });
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("approved");
    expect(r.removal?.[0]?.path).toBe(spec.removalPath);
    const change = r.removal?.[0];
    expect(change && change.op === "write" ? change.contents : "").toContain(spec.api);
  });

  it("holds on rejection (no removal)", async () => {
    const store = createMemoryStateStore();
    const heldPlanId = "v1-users-list-held";
    const services = callersOf({ count: 0 });

    // Drive past grace + drain to the gate.
    let r = await advanceApiDeprecation(heldPlanId, spec, services, store, {
      now: clock("2026-12-02T00:00:00.000Z"),
    });
    expect(r.status).toBe("blocked");
    expect(r.blockedGateId).toBe(`${heldPlanId}:approve-removal`);

    await createGate(store).decide(`${heldPlanId}:approve-removal`, "rejected");
    r = await advanceApiDeprecation(heldPlanId, spec, services, store, {
      now: clock("2026-12-03T00:00:00.000Z"),
    });
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("hold");
    expect(r.removal).toBeUndefined();
  });

  it("renders notices mentioning the api", () => {
    expect(renderDeprecationNotice(spec.api, spec.graceUntilIso)).toContain(spec.api);
    expect(renderDeprecationNotice(spec.api, spec.graceUntilIso)).toContain(spec.graceUntilIso);
    expect(renderRemovalNote(spec.api)).toContain(spec.api);
  });
});
