#!/usr/bin/env node
// loopy dogfooding harness — exercises EVERY loop end-to-end with realistic
// example inputs and prints a pass/fail report. No network, no real PRs:
//
//  - CLI-wired loops run through the real `run()` path in --dry-run mode with
//    injected boundaries / fixture files, so detect → act → guardrails → the
//    runner are all exercised exactly as in production (only publishing is
//    skipped).
//  - Catalogued-but-not-yet-wired loops (test-coverage, security-remediation)
//    are asserted to return their setup guidance.
//  - Export-only long-horizon loops are driven through their full advance()
//    lifecycles (gate → approve → emit) against a memory state store.
//
// Run after `npm run build`:  node scripts/dogfood.mjs

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { run } from "../dist/src/cli/commands/run.js";
import { createMemoryStateStore, createGate, silentLogger } from "../dist/src/core/index.js";
import { advanceExperiment } from "../dist/loops/experiment/index.js";
import { advanceCampaign } from "../dist/loops/codemod-campaign/index.js";
import { advanceModelUpgrade } from "../dist/loops/model-upgrade-migration/index.js";
import { advanceApiDeprecation } from "../dist/loops/api-deprecation-rollout/index.js";
import { advanceDepMajorMigration } from "../dist/loops/dep-major-migration/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const record = (id, ok, status, detail) => results.push({ id, ok, status, detail });

const withEnv = (extra) => ({ ...process.env, ...extra });

function fixtureDir(files) {
  const dir = mkdtempSync(join(tmpdir(), "loopy-dogfood-"));
  for (const [name, content] of Object.entries(files)) {
    const body = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    writeFileSync(join(dir, name), body);
  }
  return dir;
}

/** Normalize a `run()` outcome into { status, detail }. */
function classify(o) {
  if (!o.ran) return { status: "guidance", detail: (o.message ?? "").slice(0, 70) };
  const r = o.run ?? {};
  if (r.status === "produced") {
    if (r.outputKind === "pull-request") {
      return { status: "produced-pr", detail: (r.changes ?? []).map((c) => c.path).join(", ") };
    }
    const line = (r.comment ?? "").split("\n").find((l) => l.trim().length > 0) ?? "";
    return { status: "produced-comment", detail: line.slice(0, 70) };
  }
  return { status: r.status ?? "?", detail: r.reason ?? "" };
}

/** Run a CLI loop in dry-run and check its outcome is one of `expect`. */
async function cli(displayId, loopId, options, expect) {
  try {
    const o = await run(loopId, { dryRun: true, logger: silentLogger, ...options });
    const c = classify(o);
    record(displayId, expect.includes(c.status), c.status, c.detail);
  } catch (e) {
    record(displayId, false, "ERROR", e instanceof Error ? e.message : String(e));
  }
}

const ai = (text) => ({ complete: async () => text });

// ─────────────────────────── CLI loops: deterministic boundaries ───────────────────────────

await cli("dep-updates", "dep-updates", {
  cwd: repoRoot,
  registry: { getLatest: async (n) => (n === "yaml" ? "2.6.0" : null) },
}, ["produced-pr"]);

await cli("changelog", "changelog", {
  commitProvider: {
    listUnreleased: async () => [
      { hash: "a1b2c3d", subject: "feat: add dogfood harness" },
      { hash: "d4e5f6a", subject: "fix: cost-guardrail streak accumulation" },
    ],
    nextVersionLabel: async () => "v0.2.0",
  },
}, ["produced-pr"]);

await cli("release-train", "release-train", {
  releaseSource: {
    unreleased: async () => [
      { hash: "a1b2c3d", subject: "feat: add 11 loops" },
      { hash: "d4e5f6a", subject: "fix: streak accumulation" },
    ],
    currentVersion: async () => "0.1.0",
  },
}, ["produced-pr"]);

await cli("metric-anomaly", "metric-anomaly", {
  metricSource: {
    series: async () => [{
      name: "signups",
      points: [
        { t: "2026-06-16", value: 100 }, { t: "2026-06-17", value: 102 },
        { t: "2026-06-18", value: 99 }, { t: "2026-06-19", value: 101 },
        { t: "2026-06-20", value: 100 }, { t: "2026-06-21", value: 103 },
        { t: "2026-06-22", value: 250 }, // spike
      ],
    }],
  },
}, ["produced-pr"]);

await cli("incident-followup", "incident-followup", {
  incidentSource: {
    incidents: async () => [
      { id: "INC-1", title: "API outage", rootCause: "db pool exhausted" },
      { id: "INC-2", title: "Checkout errors", rootCause: "db pool exhausted" },
    ],
    actionItems: async () => [
      { id: "AI-1", title: "Add pool monitoring", status: "open", dueIso: "2020-01-01T00:00:00.000Z" },
    ],
  },
}, ["produced-pr"]);

const flakeRuns = [];
for (let i = 0; i < 8; i++) flakeRuns.push({ id: `r${i}`, testId: "suite/flaky", status: i % 2 === 0 ? "pass" : "fail" });
for (let i = 0; i < 8; i++) flakeRuns.push({ id: `s${i}`, testId: "suite/stable", status: "pass" });
await cli("flake-quarantine", "flake-quarantine", {
  testResults: { recent: async () => flakeRuns },
  stateStore: createMemoryStateStore(),
  readQuarantine: async () => [],
}, ["produced-pr"]);

await cli("license-sbom-drift", "license-sbom-drift", {
  sbomSource: {
    current: async () => [
      { name: "left-pad", version: "1.3.0", license: "MIT" },
      { name: "copyleft-lib", version: "2.0.0", license: "GPL-3.0" }, // violates allowlist
    ],
  },
}, ["produced-pr"]);

// ─────────────────────────── CLI loops: AI boundary (fake client) ───────────────────────────

await cli("pr-review", "pr-review", {
  prNumber: 1,
  diffProvider: { getDiff: async () => ({ files: [{ path: "src/server.ts", patch: "@@ -1 +1 @@\n+const x = eval(input)" }] }) },
  aiClient: ai(JSON.stringify({
    summary: "Adds an eval() call on request input.",
    issues: [{ severity: "error", message: "Avoid eval() on user input", file: "src/server.ts" }],
  })),
}, ["produced-comment"]);

const ticket = (i) => ({ id: `T${i}`, question: "How do I update my billing card?", resolution: "Settings > Billing > Update card.", topic: "billing" });
await cli("kb-gap", "kb-gap", {
  cwd: repoRoot,
  ticketSource: { listResolved: async () => [1, 2, 3, 4, 5].map(ticket) },
  coveredTopics: async () => [],
  aiClient: ai(JSON.stringify([{ path: "docs/kb/billing.md", contents: "# Updating your billing card\n\nSettings > Billing." }])),
}, ["produced-pr"]);

await cli("prompt-eval-gate", "prompt-eval-gate", {
  evalSource: { cases: async () => [{ id: "greet", input: "reply ok", expect: "ok" }, { id: "bye", input: "answer ok", expect: "ok" }] },
  aiClient: ai("ok"),
  stateStore: createMemoryStateStore(),
}, ["produced-comment"]);

await cli("auto-docs", "auto-docs", {
  cwd: repoRoot,
  aiClient: ai("[]"),
}, ["produced-pr", "no-work"]);

// ─────────────────────────── CLI loops: env-file fixtures ───────────────────────────

const fI18n = fixtureDir({
  "i18n.json": {
    defaultKeys: ["home.title", "home.cta", "footer.copyright"],
    locales: [{ locale: "es", keys: ["home.title", "home.cta"] }, { locale: "fr", keys: ["home.title", "home.cta", "footer.copyright"] }],
  },
});
await cli("i18n-drift", "i18n-drift", {
  cwd: fI18n,
  env: withEnv({ LOOPY_I18N_FILE: join(fI18n, "i18n.json") }),
}, ["produced-pr"]);

const fPerf = fixtureDir({
  "perf.json": [{ name: "bundle_kb", value: 520 }, { name: "ttfb_ms", value: 180 }],
  "perf-baseline.json": { bundle_kb: 400, ttfb_ms: 175 },
});
await cli("perf-budget", "perf-budget", {
  cwd: fPerf,
  env: withEnv({ LOOPY_PERF_FILE: join(fPerf, "perf.json") }),
}, ["produced-pr"]);

const fA11y = fixtureDir({
  "a11y.json": [{ id: "color-contrast", selector: ".btn", impact: "serious" }, { id: "label", selector: "#email", impact: "critical" }],
  "a11y-baseline.json": [{ id: "color-contrast", selector: ".btn" }],
});
await cli("a11y-baseline", "a11y-baseline", {
  cwd: fA11y,
  env: withEnv({ LOOPY_A11Y_FILE: join(fA11y, "a11y.json") }),
}, ["produced-pr"]);

const fRb = fixtureDir({
  "runbooks.json": [
    { path: "runbooks/deploy.md", lastReviewedIso: "2020-01-01T00:00:00.000Z" },
    { path: "runbooks/oncall.md", lastReviewedIso: "2026-06-01T00:00:00.000Z" },
  ],
});
await cli("runbook-freshness", "runbook-freshness", {
  cwd: fRb,
  env: withEnv({ LOOPY_RUNBOOKS_FILE: join(fRb, "runbooks.json") }),
}, ["produced-pr"]);

const tibState = createMemoryStateStore();
await tibState.save("test-impact:baseline", { "suite/login": 100, "suite/search": 200 });
const fTib = fixtureDir({ "timings.json": [{ testId: "suite/login", durationMs: 260 }, { testId: "suite/search", durationMs: 205 }] });
await cli("test-impact-budget", "test-impact-budget", {
  cwd: fTib,
  env: withEnv({ LOOPY_TEST_TIMINGS_FILE: join(fTib, "timings.json") }),
  stateStore: tibState,
}, ["produced-pr"]);

const fDrift = fixtureDir({ "drift.json": { evalCategories: ["login", "search"], productionCategories: ["login", "search", "checkout", "refund"] } });
await cli("eval-set-drift", "eval-set-drift", {
  cwd: fDrift,
  env: withEnv({ LOOPY_EVAL_DRIFT_FILE: join(fDrift, "drift.json") }),
  stateStore: createMemoryStateStore(),
}, ["produced-pr"]);

// data-contract-guard: breaking change → blocked comment, then approve → PR.
const dcState = createMemoryStateStore();
await dcState.save("data-contract:baseline", { fields: [{ name: "id", type: "string", required: true }, { name: "email", type: "string", required: true }] });
const fDc = fixtureDir({ "schema.json": { fields: [{ name: "id", type: "string", required: true }] } }); // email removed → breaking
await cli("data-contract-guard (breaking→block)", "data-contract-guard", {
  cwd: fDc,
  env: withEnv({ LOOPY_SCHEMA_FILE: join(fDc, "schema.json") }),
  stateStore: dcState,
}, ["produced-comment"]);
await createGate(dcState).decide("data-contract:accept", "approved");
await cli("data-contract-guard (approved→PR)", "data-contract-guard", {
  cwd: fDc,
  env: withEnv({ LOOPY_SCHEMA_FILE: join(fDc, "schema.json") }),
  stateStore: dcState,
}, ["produced-pr"]);

// cost-guardrail: idle streak crosses minStreak → blocked comment, then approve → PR.
const cgState = createMemoryStateStore();
await cgState.save("cost-guardrail:streaks", { "idle-db": 2 });
const fCg = fixtureDir({ "usage.json": [{ id: "idle-db", utilization: 0.0, monthlyCost: 420 }] });
await cli("cost-guardrail (idle→block)", "cost-guardrail", {
  cwd: fCg,
  env: withEnv({ LOOPY_USAGE_FILE: join(fCg, "usage.json") }),
  stateStore: cgState,
}, ["produced-comment"]);
await createGate(cgState).decide("cost-guardrail:remediate", "approved");
await cli("cost-guardrail (approved→PR)", "cost-guardrail", {
  cwd: fCg,
  env: withEnv({ LOOPY_USAGE_FILE: join(fCg, "usage.json") }),
  stateStore: cgState,
}, ["produced-pr"]);

// ─────────────────────────── CLI loops: catalogued, not yet wired ───────────────────────────

await cli("test-coverage", "test-coverage", { cwd: repoRoot }, ["guidance"]);
await cli("security-remediation", "security-remediation", { cwd: repoRoot }, ["guidance"]);

// ─────────────────────────── Export-only long-horizon loops ───────────────────────────

async function lifecycle(id, fn) {
  try {
    const ok = await fn();
    record(id, ok.ok, "lifecycle", ok.detail);
  } catch (e) {
    record(id, false, "ERROR", e instanceof Error ? e.message : String(e));
  }
}

await lifecycle("model-upgrade-migration", async () => {
  const store = createMemoryStateStore();
  const gate = createGate(store);
  const spec = { currentModel: "z-ai/glm-5.2", candidateModel: "z-ai/glm-6", configPath: "loopy.model.json" };
  const services = { evaluate: async (m) => (m === "z-ai/glm-6" ? { score: 1, perCase: { a: true, b: true } } : { score: 0.8, perCase: { a: true, b: true } }) };
  let r = await advanceModelUpgrade("dogfood-glm6", spec, services, store);
  const blocked = r.status === "blocked" && r.blockedGateId === "dogfood-glm6:approve";
  await gate.decide("dogfood-glm6:approve", "approved");
  r = await advanceModelUpgrade("dogfood-glm6", spec, services, store);
  const done = r.status === "completed" && r.decision === "approved" && r.bump?.[0]?.path === "loopy.model.json";
  return { ok: blocked && done, detail: "blocked at gate → approved → model bump emitted" };
});

await lifecycle("api-deprecation-rollout", async () => {
  const store = createMemoryStateStore();
  const box = { count: 3 };
  const services = { remainingCallers: async () => box.count };
  const spec = { api: "v1.users.list", noticePath: "docs/deprecations/v1.md", removalPath: "docs/deprecations/v1-removed.md", graceUntilIso: "2026-12-01T00:00:00.000Z" };
  const at = (iso) => ({ now: () => new Date(iso) });
  let r = await advanceApiDeprecation("dogfood-dep", spec, services, store, at("2026-06-23T00:00:00.000Z"));
  const s1 = r.status === "waiting" && r.currentStep === "grace-period" && r.notice?.[0]?.path === spec.noticePath;
  r = await advanceApiDeprecation("dogfood-dep", spec, services, store, at("2026-12-02T00:00:00.000Z"));
  const s2 = r.status === "waiting" && r.currentStep === "verify-callers";
  box.count = 0;
  r = await advanceApiDeprecation("dogfood-dep", spec, services, store, at("2026-12-03T00:00:00.000Z"));
  const s3 = r.status === "blocked" && r.blockedGateId === "dogfood-dep:approve-removal";
  await createGate(store).decide("dogfood-dep:approve-removal", "approved");
  r = await advanceApiDeprecation("dogfood-dep", spec, services, store, at("2026-12-04T00:00:00.000Z"));
  const s4 = r.status === "completed" && r.decision === "approved" && r.removal?.[0]?.path === spec.removalPath;
  return { ok: s1 && s2 && s3 && s4, detail: "grace wait → caller drain → gate → approved → removal emitted" };
});

await lifecycle("dep-major-migration", async () => {
  const store = createMemoryStateStore();
  const spec = { pkg: "left-pad", fromVersion: "1.0.0", toVersion: "2.0.0", manifestPath: "package.json" };
  const services = { verify: async () => ({ ok: true, log: "all tests pass" }) };
  const readManifest = async () => `{"dependencies":{"left-pad":"^1.0.0"}}`;
  let r = await advanceDepMajorMigration("dogfood-lp", spec, services, store, readManifest);
  const blocked = r.status === "blocked" && r.ok === true;
  await createGate(store).decide("dogfood-lp:approve", "approved");
  r = await advanceDepMajorMigration("dogfood-lp", spec, services, store, readManifest);
  const done = r.status === "completed" && r.decision === "approved" && String(r.bump?.[0]?.contents).includes("^2.0.0");
  return { ok: blocked && done, detail: "verify green → gate → approved → ^2.0.0 bump emitted" };
});

await lifecycle("experiment", async () => {
  const store = createMemoryStateStore();
  const gate = createGate(store);
  const hypothesis = { id: "exp-cta", statement: "Bigger CTA increases signups", metric: "signup_rate", guardrailMetrics: ["latency_p95"] };
  const design = { variants: ["control", "bigger-cta"], metric: "signup_rate", guardrailMetrics: ["latency_p95"], minSampleSize: 10000, durationDays: 14 };
  const ready = { value: null };
  const services = { designer: async () => design, platform: { launch: async () => ({ experimentKey: "key-1" }), results: async () => ready.value } };
  let r = await advanceExperiment("exp-cta", hypothesis, services, store);
  const s1 = r.status === "blocked" && r.blockedGateId === "exp-cta:design";
  await gate.decide("exp-cta:design", "approved");
  r = await advanceExperiment("exp-cta", hypothesis, services, store);
  const s2 = r.status === "waiting" && r.currentStep === "bake";
  ready.value = { significant: true, metricDelta: 0.04, guardrailBreached: false, recommendation: "ship" };
  r = await advanceExperiment("exp-cta", hypothesis, services, store);
  const s3 = r.status === "blocked" && r.blockedGateId === "exp-cta:decision";
  await gate.decide("exp-cta:decision", "approved");
  r = await advanceExperiment("exp-cta", hypothesis, services, store);
  const s4 = r.status === "completed" && r.memory["finalDecision"] === "ship";
  return { ok: s1 && s2 && s3 && s4, detail: "design gate → bake → readout → decision gate → ship" };
});

await lifecycle("codemod-campaign", async () => {
  const store = createMemoryStateStore();
  const gate = createGate(store);
  const prState = new Map();
  let next = 0;
  const prs = {
    state: async (n) => prState.get(n) ?? "open",
    open: async () => { next += 1; prState.set(next, "open"); return { number: next }; },
  };
  const changes = [{ path: "src/a.ts", op: "write", contents: "x" }];
  const services = (targets) => ({ codemod: async () => changes, targets: { targets: async () => targets }, runner: async () => ({ ok: true }), prs });
  const spec = { batchSize: 2, maxOpenPrs: 5, title: "Migrate to X" };
  const targets = ["a", "b", "c", "d"];
  let r = await advanceCampaign("dogfood-camp", spec, services(targets), store);
  const s1 = r.status === "blocked" && r.gateId === "dogfood-camp:pilot";
  await gate.decide("dogfood-camp:pilot", "approved");
  r = await advanceCampaign("dogfood-camp", spec, services(targets), store);
  const s2 = r.status === "batch-opened" && r.pr?.number === 1;
  r = await advanceCampaign("dogfood-camp", spec, services(targets), store);
  const s3 = r.status === "batch-opened" && r.pr?.number === 2;
  prState.set(1, "merged");
  prState.set(2, "merged");
  r = await advanceCampaign("dogfood-camp", spec, services(targets), store);
  const s4 = r.status === "completed" && r.ledger.migrated.length === 4;
  return { ok: s1 && s2 && s3 && s4, detail: "pilot gate → batch 1 → batch 2 → merge → completed" };
});

// ─────────────────────────── Report ───────────────────────────

const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
console.log("\nloopy dogfood — all loops, real example inputs\n");
console.log(pad("loop", 38) + pad("outcome", 18) + "detail");
console.log("─".repeat(100));
for (const r of results) {
  const mark = r.ok ? "✓" : "✗";
  console.log(`${mark} ${pad(r.id, 36)}${pad(r.status, 18)}${(r.detail ?? "").slice(0, 44)}`);
}
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log("─".repeat(100));
console.log(`\n${passed}/${results.length} passed${failed ? `, ${failed} FAILED` : ""}.\n`);
process.exit(failed ? 1 : 0);
