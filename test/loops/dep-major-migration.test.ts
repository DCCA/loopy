import { describe, expect, it } from "vitest";
import { createGate, createMemoryStateStore, type StateStore } from "../../src/core/index.js";
import {
  advanceDepMajorMigration,
  bumpManifest,
  renderMigrationReport,
  type DepMajorServices,
  type DepMajorSpec,
  type VerifyResult,
} from "../../loops/dep-major-migration/index.js";

const spec: DepMajorSpec = {
  pkg: "left-pad",
  fromVersion: "1.0.0",
  toVersion: "2.0.0",
  manifestPath: "package.json",
};

/** Verifier returning a canned result. */
const verifierOf = (result: VerifyResult): DepMajorServices => ({
  verify: async () => result,
});

const manifest = `{"dependencies":{"left-pad":"^1.0.0"}}`;
const readManifest = async (): Promise<string> => manifest;

describe("dep-major-migration", () => {
  it("verifies green, blocks at the gate, then emits the bump on approval", async () => {
    const store: StateStore = createMemoryStateStore();
    const planId = "left-pad-2";
    const services = verifierOf({ ok: true, log: "all tests pass" });

    let r = await advanceDepMajorMigration(planId, spec, services, store, readManifest);
    expect(r.status).toBe("blocked");
    expect(r.blockedGateId).toBe("left-pad-2:approve");
    expect(r.ok).toBe(true);

    await createGate(store).decide("left-pad-2:approve", "approved");
    r = await advanceDepMajorMigration(planId, spec, services, store, readManifest);
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("approved");
    const bump = r.bump?.[0];
    expect(bump?.path).toBe("package.json");
    expect(bump && bump.op === "write" ? bump.contents : "").toContain("^2.0.0");
  });

  it("holds immediately on a red build without ever requesting the gate", async () => {
    const store: StateStore = createMemoryStateStore();
    const planId = "red-build";
    const services = verifierOf({ ok: false, log: "TypeError: x is not a function" });

    const r = await advanceDepMajorMigration(planId, spec, services, store, readManifest);
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("hold");
    expect(r.bump).toBeUndefined();
    expect(r.ok).toBe(false);
    expect(r.log).toBe("TypeError: x is not a function");
    // The gate was never requested for a red build.
    expect(await createGate(store).get("red-build:approve")).toBeNull();
  });

  it("holds on rejection (no bump)", async () => {
    const store: StateStore = createMemoryStateStore();
    const planId = "rejected";
    const services = verifierOf({ ok: true, log: "all tests pass" });

    let r = await advanceDepMajorMigration(planId, spec, services, store, readManifest);
    expect(r.status).toBe("blocked");

    await createGate(store).decide("rejected:approve", "rejected");
    r = await advanceDepMajorMigration(planId, spec, services, store, readManifest);
    expect(r.status).toBe("completed");
    expect(r.decision).toBe("hold");
    expect(r.bump).toBeUndefined();
  });
});

describe("bumpManifest", () => {
  it("updates an existing dependency to ^toVersion and leaves others", () => {
    const input = JSON.stringify({ dependencies: { "left-pad": "^1.0.0", other: "^3.0.0" } });
    const out = JSON.parse(bumpManifest(input, "left-pad", "2.0.0")) as {
      dependencies: Record<string, string>;
    };
    expect(out.dependencies["left-pad"]).toBe("^2.0.0");
    expect(out.dependencies["other"]).toBe("^3.0.0");
  });

  it("updates a devDependencies entry when present", () => {
    const input = JSON.stringify({
      dependencies: { "left-pad": "^1.0.0" },
      devDependencies: { "left-pad": "^1.0.0" },
    });
    const out = JSON.parse(bumpManifest(input, "left-pad", "2.0.0")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(out.dependencies["left-pad"]).toBe("^2.0.0");
    expect(out.devDependencies["left-pad"]).toBe("^2.0.0");
  });
});

describe("renderMigrationReport", () => {
  it("contains the package and versions", () => {
    const report = renderMigrationReport(spec, { ok: true, log: "ok" });
    expect(report).toContain("left-pad");
    expect(report).toContain("1.0.0");
    expect(report).toContain("2.0.0");
  });
});
