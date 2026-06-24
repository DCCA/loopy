#!/usr/bin/env node
// loopy dogfooding harness — exercises EVERY loop end-to-end with realistic
// example inputs and (a) asserts each produces the expected outcome and (b) can
// emit the REAL artifacts each loop produces so users can see them.
//
//  - CLI-wired loops run through the real `run()` path in --dry-run mode with
//    injected boundaries / fixture files, so detect → act → guardrails → the
//    runner are all exercised exactly as in production (only publishing skipped).
//  - Catalogued-but-not-yet-wired loops (test-coverage, security-remediation)
//    are asserted to return their setup guidance.
//  - Export-only long-horizon loops are driven through their full advance()
//    lifecycles (gate → approve → emit) against a memory state store.
//
//   npm run build && node scripts/dogfood.mjs            # assert only
//   npm run build && node scripts/dogfood.mjs --emit demos   # + write demos/

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import { run } from "../dist/src/cli/commands/run.js";
import { createMemoryStateStore, createGate, silentLogger } from "../dist/src/core/index.js";
import { advanceExperiment } from "../dist/loops/experiment/index.js";
import { advanceCampaign } from "../dist/loops/codemod-campaign/index.js";
import { advanceModelUpgrade } from "../dist/loops/model-upgrade-migration/index.js";
import { advanceApiDeprecation } from "../dist/loops/api-deprecation-rollout/index.js";
import { advanceDepMajorMigration } from "../dist/loops/dep-major-migration/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const withEnv = (extra) => ({ ...process.env, ...extra });

function fixtureDir(files) {
  const dir = mkdtempSync(join(tmpdir(), "loopy-dogfood-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

const ai = (text) => ({ complete: async () => text });

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

/** Pull the real produced artifacts (PR files / comment) out of a run outcome. */
function artifactsFromRun(o) {
  const arts = [];
  if (o.ran && o.run?.status === "produced") {
    if (o.run.outputKind === "pull-request") {
      for (const c of o.run.changes ?? []) {
        if (c.op === "write") arts.push({ kind: "file", path: c.path, contents: c.contents ?? "" });
      }
      if (o.run.summary) arts.push({ kind: "file", path: "_pr-body.md", contents: o.run.summary });
    } else if (o.run.outputKind === "comment") {
      arts.push({ kind: "comment", path: "comment.md", contents: o.run.comment ?? "" });
    }
  }
  return arts;
}

const scenarios = [];

/** Register a CLI-loop scenario (runs through the real run() in dry-run). */
function cli(id, input, loopId, options, expect, before) {
  scenarios.push({
    id, input, kind: "cli",
    run: async () => {
      if (before) await before();
      const o = await run(loopId, { dryRun: true, logger: silentLogger, ...options });
      const c = classify(o);
      return { ok: expect.includes(c.status), status: c.status, detail: c.detail, artifacts: artifactsFromRun(o) };
    },
  });
}

/** Register an export-only lifecycle scenario. */
function lifecycle(id, input, fn) {
  scenarios.push({
    id, input, kind: "lifecycle",
    run: async () => {
      const { ok, detail, artifacts } = await fn();
      return { ok, status: "lifecycle", detail, artifacts: artifacts ?? [] };
    },
  });
}

// ─────────────────────────── CLI loops: deterministic boundaries ───────────────────────────

cli("dep-updates", "package.json with `yaml ^2.5.1`; registry reports 2.6.0", "dep-updates", {
  cwd: repoRoot,
  registry: { getLatest: async (n) => (n === "yaml" ? "2.6.0" : null) },
}, ["produced-pr"]);

cli("changelog", "2 unreleased conventional commits (feat + fix)", "changelog", {
  commitProvider: {
    listUnreleased: async () => [
      { hash: "a1b2c3d", subject: "feat: add dogfood harness" },
      { hash: "d4e5f6a", subject: "fix: cost-guardrail streak accumulation" },
    ],
    nextVersionLabel: async () => "v0.2.0",
  },
}, ["produced-pr"]);

cli("release-train", "v0.1.0 + a feat and a fix unreleased", "release-train", {
  releaseSource: {
    unreleased: async () => [
      { hash: "a1b2c3d", subject: "feat: add 11 loops" },
      { hash: "d4e5f6a", subject: "fix: streak accumulation" },
    ],
    currentVersion: async () => "0.1.0",
  },
}, ["produced-pr"]);

cli("metric-anomaly", "daily signups ~100 for a week, then a 250 spike", "metric-anomaly", {
  metricSource: {
    series: async () => [{
      name: "signups",
      points: [
        { t: "2026-06-16", value: 100 }, { t: "2026-06-17", value: 102 },
        { t: "2026-06-18", value: 99 }, { t: "2026-06-19", value: 101 },
        { t: "2026-06-20", value: 100 }, { t: "2026-06-21", value: 103 },
        { t: "2026-06-22", value: 250 },
      ],
    }],
  },
}, ["produced-pr"]);

cli("incident-followup", "2 incidents sharing a root cause + 1 overdue action item", "incident-followup", {
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
cli("flake-quarantine", "8 alternating runs of `suite/flaky` + a stable test", "flake-quarantine", {
  testResults: { recent: async () => flakeRuns },
  stateStore: createMemoryStateStore(),
  readQuarantine: async () => [],
}, ["produced-pr"]);

cli("license-sbom-drift", "SBOM with an MIT dep and a GPL-3.0 dep", "license-sbom-drift", {
  sbomSource: {
    current: async () => [
      { name: "left-pad", version: "1.3.0", license: "MIT" },
      { name: "copyleft-lib", version: "2.0.0", license: "GPL-3.0" },
    ],
  },
}, ["produced-pr"]);

// ─────────────────────────── CLI loops: AI boundary (fake client) ───────────────────────────

cli("pr-review", "a 1-file diff that introduces `eval(input)`", "pr-review", {
  prNumber: 1,
  diffProvider: { getDiff: async () => ({ files: [{ path: "src/server.ts", patch: "@@ -1 +1 @@\n+const x = eval(input)" }] }) },
  aiClient: ai(JSON.stringify({
    summary: "Adds an eval() call on request input.",
    issues: [{ severity: "error", message: "Avoid eval() on user input", file: "src/server.ts" }],
  })),
}, ["produced-comment"]);

const ticket = (i) => ({ id: `T${i}`, question: "How do I update my billing card?", resolution: "Settings > Billing > Update card.", topic: "billing" });
cli("kb-gap", "5 resolved tickets all about the `billing` topic", "kb-gap", {
  cwd: repoRoot,
  ticketSource: { listResolved: async () => [1, 2, 3, 4, 5].map(ticket) },
  coveredTopics: async () => [],
  aiClient: ai(JSON.stringify([{ path: "docs/kb/billing.md", contents: "# Updating your billing card\n\nGo to **Settings > Billing > Update card**.\n" }])),
}, ["produced-pr"]);

cli("prompt-eval-gate", "2 eval cases, model passes both, no baseline yet", "prompt-eval-gate", {
  evalSource: { cases: async () => [{ id: "greet", input: "reply ok", expect: "ok" }, { id: "bye", input: "answer ok", expect: "ok" }] },
  aiClient: ai("ok"),
  stateStore: createMemoryStateStore(),
}, ["produced-comment"]);

cli("auto-docs", "clean tree; AI returns no doc changes", "auto-docs", {
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
cli("i18n-drift", "3 default keys; `es` locale missing `footer.copyright`", "i18n-drift", {
  cwd: fI18n, env: withEnv({ LOOPY_I18N_FILE: join(fI18n, "i18n.json") }),
}, ["produced-pr"]);

const fPerf = fixtureDir({
  "perf.json": [{ name: "bundle_kb", value: 520 }, { name: "ttfb_ms", value: 180 }],
  "perf-baseline.json": { bundle_kb: 400, ttfb_ms: 175 },
});
cli("perf-budget", "bundle 520kb vs 400kb baseline (+30%, over 10% budget)", "perf-budget", {
  cwd: fPerf, env: withEnv({ LOOPY_PERF_FILE: join(fPerf, "perf.json") }),
}, ["produced-pr"]);

const fA11y = fixtureDir({
  "a11y.json": [{ id: "color-contrast", selector: ".btn", impact: "serious" }, { id: "label", selector: "#email", impact: "critical" }],
  "a11y-baseline.json": [{ id: "color-contrast", selector: ".btn" }],
});
cli("a11y-baseline", "a new `label` violation not in the accepted baseline", "a11y-baseline", {
  cwd: fA11y, env: withEnv({ LOOPY_A11Y_FILE: join(fA11y, "a11y.json") }),
}, ["produced-pr"]);

const fRb = fixtureDir({
  "runbooks.json": [
    { path: "runbooks/deploy.md", lastReviewedIso: "2020-01-01T00:00:00.000Z" },
    { path: "runbooks/oncall.md", lastReviewedIso: "2026-06-01T00:00:00.000Z" },
  ],
});
cli("runbook-freshness", "`deploy.md` last reviewed in 2020 (past interval)", "runbook-freshness", {
  cwd: fRb, env: withEnv({ LOOPY_RUNBOOKS_FILE: join(fRb, "runbooks.json") }),
}, ["produced-pr"]);

const tibState = createMemoryStateStore();
await tibState.save("test-impact:baseline", { "suite/login": 100, "suite/search": 200 });
const fTib = fixtureDir({ "timings.json": [{ testId: "suite/login", durationMs: 260 }, { testId: "suite/search", durationMs: 205 }] });
cli("test-impact-budget", "`suite/login` 260ms vs 100ms baseline (+160%, over 50%)", "test-impact-budget", {
  cwd: fTib, env: withEnv({ LOOPY_TEST_TIMINGS_FILE: join(fTib, "timings.json") }), stateStore: tibState,
}, ["produced-pr"]);

const fDrift = fixtureDir({ "drift.json": { evalCategories: ["login", "search"], productionCategories: ["login", "search", "checkout", "refund"] } });
cli("eval-set-drift", "prod traffic has `checkout`/`refund`; eval set doesn't", "eval-set-drift", {
  cwd: fDrift, env: withEnv({ LOOPY_EVAL_DRIFT_FILE: join(fDrift, "drift.json") }), stateStore: createMemoryStateStore(),
}, ["produced-pr"]);

// data-contract-guard: breaking change → blocked comment, then approve → PR.
const dcState = createMemoryStateStore();
await dcState.save("data-contract:baseline", { fields: [{ name: "id", type: "string", required: true }, { name: "email", type: "string", required: true }] });
const fDc = fixtureDir({ "schema.json": { fields: [{ name: "id", type: "string", required: true }] } });
cli("data-contract-guard (breaking-block)", "baseline has `email`; new schema removes it (breaking)", "data-contract-guard", {
  cwd: fDc, env: withEnv({ LOOPY_SCHEMA_FILE: join(fDc, "schema.json") }), stateStore: dcState,
}, ["produced-comment"]);
cli("data-contract-guard (approved-PR)", "the same breaking change, after a human approves the gate", "data-contract-guard", {
  cwd: fDc, env: withEnv({ LOOPY_SCHEMA_FILE: join(fDc, "schema.json") }), stateStore: dcState,
}, ["produced-pr"], async () => { await createGate(dcState).decide("data-contract:accept", "approved"); });

// cost-guardrail: idle streak crosses minStreak → blocked comment, then approve → PR.
const cgState = createMemoryStateStore();
await cgState.save("cost-guardrail:streaks", { "idle-db": 2 });
const fCg = fixtureDir({ "usage.json": [{ id: "idle-db", utilization: 0.0, monthlyCost: 420 }] });
cli("cost-guardrail (idle-block)", "`idle-db` at 0% util, idle streak reaches the threshold", "cost-guardrail", {
  cwd: fCg, env: withEnv({ LOOPY_USAGE_FILE: join(fCg, "usage.json") }), stateStore: cgState,
}, ["produced-comment"]);
cli("cost-guardrail (approved-PR)", "the same idle resource, after a human approves remediation", "cost-guardrail", {
  cwd: fCg, env: withEnv({ LOOPY_USAGE_FILE: join(fCg, "usage.json") }), stateStore: cgState,
}, ["produced-pr"], async () => { await createGate(cgState).decide("cost-guardrail:remediate", "approved"); });

// ─────────────────────────── CLI loops: catalogued, not yet wired ───────────────────────────

cli("test-coverage", "(no boundary wired yet)", "test-coverage", { cwd: repoRoot }, ["guidance"]);
cli("security-remediation", "(no boundary wired yet)", "security-remediation", { cwd: repoRoot }, ["guidance"]);

// ─────────────────────────── Export-only long-horizon loops ───────────────────────────

lifecycle("model-upgrade-migration", "golden-set diff glm-5.2 → glm-6 (strictly better)", async () => {
  const store = createMemoryStateStore();
  const gate = createGate(store);
  const spec = { currentModel: "z-ai/glm-5.2", candidateModel: "z-ai/glm-6", configPath: "loopy.model.json" };
  const services = { evaluate: async (m) => (m === "z-ai/glm-6" ? { score: 1, perCase: { a: true, b: true } } : { score: 0.8, perCase: { a: true, b: true } }) };
  const t = ["# model-upgrade-migration — lifecycle transcript", "", "Spec: `z-ai/glm-5.2` → `z-ai/glm-6`, config `loopy.model.json`.", ""];
  let r = await advanceModelUpgrade("glm6", spec, services, store);
  t.push(`1. advance → **${r.status}** at gate \`${r.blockedGateId}\` (Δscore +20 pts, ${r.memory["regressed"]?.length ?? 0} regressions)`);
  const blocked = r.status === "blocked" && r.blockedGateId === "glm6:approve";
  await gate.decide("glm6:approve", "approved");
  t.push("2. human **approves** the gate");
  r = await advanceModelUpgrade("glm6", spec, services, store);
  t.push(`3. advance → **${r.status}**, decision \`${r.decision}\` — model bump emitted to \`${r.bump?.[0]?.path}\``, "");
  const done = r.status === "completed" && r.decision === "approved" && r.bump?.[0]?.path === "loopy.model.json";
  return {
    ok: blocked && done, detail: "blocked at gate → approved → model bump emitted",
    artifacts: [{ kind: "transcript", path: "lifecycle.md", contents: t.join("\n") }, { kind: "file", path: "loopy.model.json", contents: r.bump?.[0]?.contents ?? "" }],
  };
});

lifecycle("api-deprecation-rollout", "deprecate v1.users.list: grace → drain → gated removal", async () => {
  const store = createMemoryStateStore();
  const box = { count: 3 };
  const services = { remainingCallers: async () => box.count };
  const spec = { api: "v1.users.list", noticePath: "docs/deprecations/v1-users-list.md", removalPath: "docs/deprecations/v1-users-list-removed.md", graceUntilIso: "2026-12-01T00:00:00.000Z" };
  const at = (iso) => ({ now: () => new Date(iso) });
  const t = ["# api-deprecation-rollout — lifecycle transcript", "", "Deprecating `v1.users.list`, grace period until 2026-12-01.", ""];
  let r = await advanceApiDeprecation("dep", spec, services, store, at("2026-06-23T00:00:00.000Z"));
  t.push(`1. advance (before grace deadline) → **${r.status}** at \`${r.currentStep}\`; deprecation notice emitted`);
  const s1 = r.status === "waiting" && r.currentStep === "grace-period" && r.notice?.[0]?.path === spec.noticePath;
  const notice = r.notice?.[0]?.contents ?? "";
  r = await advanceApiDeprecation("dep", spec, services, store, at("2026-12-02T00:00:00.000Z"));
  t.push(`2. advance (after deadline, 3 callers remain) → **${r.status}** at \`${r.currentStep}\` (won't remove while callers remain)`);
  const s2 = r.status === "waiting" && r.currentStep === "verify-callers";
  box.count = 0;
  r = await advanceApiDeprecation("dep", spec, services, store, at("2026-12-03T00:00:00.000Z"));
  t.push(`3. advance (callers drained to 0) → **${r.status}** at gate \`${r.blockedGateId}\``);
  const s3 = r.status === "blocked" && r.blockedGateId === "dep:approve-removal";
  await createGate(store).decide("dep:approve-removal", "approved");
  t.push("4. human **approves** removal");
  r = await advanceApiDeprecation("dep", spec, services, store, at("2026-12-04T00:00:00.000Z"));
  t.push(`5. advance → **${r.status}**, decision \`${r.decision}\` — removal change emitted`, "");
  const s4 = r.status === "completed" && r.decision === "approved" && r.removal?.[0]?.path === spec.removalPath;
  return {
    ok: s1 && s2 && s3 && s4, detail: "grace wait → caller drain → gate → approved → removal emitted",
    artifacts: [
      { kind: "transcript", path: "lifecycle.md", contents: t.join("\n") },
      { kind: "file", path: "deprecation-notice.md", contents: notice },
      { kind: "file", path: "removal-note.md", contents: r.removal?.[0]?.contents ?? "" },
    ],
  };
});

lifecycle("dep-major-migration", "migrate left-pad 1.x → 2.0.0 after a green build", async () => {
  const store = createMemoryStateStore();
  const spec = { pkg: "left-pad", fromVersion: "1.0.0", toVersion: "2.0.0", manifestPath: "package.json" };
  const services = { verify: async () => ({ ok: true, log: "all tests pass" }) };
  const readManifest = async () => `{"dependencies":{"left-pad":"^1.0.0"}}`;
  const t = ["# dep-major-migration — lifecycle transcript", "", "Migrating `left-pad` 1.0.0 → 2.0.0 (a major dep-updates deliberately skips).", ""];
  let r = await advanceDepMajorMigration("lp", spec, services, store, readManifest);
  t.push(`1. advance → verify build **${r.ok ? "green" : "red"}** → **${r.status}** at gate \`${r.blockedGateId}\``);
  const blocked = r.status === "blocked" && r.ok === true;
  await createGate(store).decide("lp:approve", "approved");
  t.push("2. human **approves** the bump");
  r = await advanceDepMajorMigration("lp", spec, services, store, readManifest);
  t.push(`3. advance → **${r.status}**, decision \`${r.decision}\` — manifest bump emitted`, "");
  const done = r.status === "completed" && r.decision === "approved" && String(r.bump?.[0]?.contents).includes("^2.0.0");
  return {
    ok: blocked && done, detail: "verify green → gate → approved → ^2.0.0 bump emitted",
    artifacts: [{ kind: "transcript", path: "lifecycle.md", contents: t.join("\n") }, { kind: "file", path: "package.json", contents: r.bump?.[0]?.contents ?? "" }],
  };
});

lifecycle("experiment", "A/B test a bigger CTA: design → bake → readout → ship", async () => {
  const store = createMemoryStateStore();
  const gate = createGate(store);
  const hypothesis = { id: "exp-cta", statement: "Bigger CTA increases signups", metric: "signup_rate", guardrailMetrics: ["latency_p95"] };
  const design = { variants: ["control", "bigger-cta"], metric: "signup_rate", guardrailMetrics: ["latency_p95"], minSampleSize: 10000, durationDays: 14 };
  const ready = { value: null };
  const services = { designer: async () => design, platform: { launch: async () => ({ experimentKey: "key-1" }), results: async () => ready.value } };
  const t = ["# experiment — lifecycle transcript", "", `Hypothesis: "${hypothesis.statement}".`, ""];
  let r = await advanceExperiment("exp-cta", hypothesis, services, store);
  t.push(`1. advance → **${r.status}** at gate \`${r.blockedGateId}\` (design awaiting approval)`);
  const s1 = r.status === "blocked" && r.blockedGateId === "exp-cta:design";
  await gate.decide("exp-cta:design", "approved");
  t.push("2. human **approves** the design");
  r = await advanceExperiment("exp-cta", hypothesis, services, store);
  t.push(`3. advance → launched (key \`${r.memory["experimentKey"]}\`), **${r.status}** at \`${r.currentStep}\``);
  const s2 = r.status === "waiting" && r.currentStep === "bake";
  ready.value = { significant: true, metricDelta: 0.04, guardrailBreached: false, recommendation: "ship" };
  r = await advanceExperiment("exp-cta", hypothesis, services, store);
  t.push(`4. advance (results in) → readout written, **${r.status}** at gate \`${r.blockedGateId}\``);
  const s3 = r.status === "blocked" && r.blockedGateId === "exp-cta:decision";
  const readout = String(r.memory["readout"] ?? "");
  await gate.decide("exp-cta:decision", "approved");
  t.push("5. human **approves** the ship decision");
  r = await advanceExperiment("exp-cta", hypothesis, services, store);
  t.push(`6. advance → **${r.status}**, final decision \`${r.memory["finalDecision"]}\``, "");
  const s4 = r.status === "completed" && r.memory["finalDecision"] === "ship";
  return {
    ok: s1 && s2 && s3 && s4, detail: "design gate → bake → readout → decision gate → ship",
    artifacts: [{ kind: "transcript", path: "lifecycle.md", contents: t.join("\n") }, { kind: "file", path: "readout.md", contents: readout }],
  };
});

lifecycle("codemod-campaign", "throttled cross-PR migration of 4 files in batches of 2", async () => {
  const store = createMemoryStateStore();
  const gate = createGate(store);
  const prState = new Map();
  let next = 0;
  const prs = { state: async (n) => prState.get(n) ?? "open", open: async () => { next += 1; prState.set(next, "open"); return { number: next }; } };
  const changes = [{ path: "src/a.ts", op: "write", contents: "x" }];
  const services = (targets) => ({ codemod: async () => changes, targets: { targets: async () => targets }, runner: async () => ({ ok: true }), prs });
  const spec = { batchSize: 2, maxOpenPrs: 5, title: "Migrate to X" };
  const targets = ["a", "b", "c", "d"];
  const t = ["# codemod-campaign — lifecycle transcript", "", "Campaign: migrate 4 files, batch size 2, pilot-gated.", ""];
  let r = await advanceCampaign("camp", spec, services(targets), store);
  t.push(`1. advance → **${r.status}** on pilot gate \`${r.gateId}\` (no PRs until approved)`);
  const s1 = r.status === "blocked" && r.gateId === "camp:pilot";
  await gate.decide("camp:pilot", "approved");
  t.push("2. human **approves** the pilot");
  r = await advanceCampaign("camp", spec, services(targets), store);
  t.push(`3. advance → **${r.status}**, opened PR #${r.pr?.number} for [${r.ledger.open[0]?.files?.join(", ")}]`);
  const s2 = r.status === "batch-opened" && r.pr?.number === 1;
  r = await advanceCampaign("camp", spec, services(targets), store);
  t.push(`4. advance → **${r.status}**, opened PR #${r.pr?.number}`);
  const s3 = r.status === "batch-opened" && r.pr?.number === 2;
  prState.set(1, "merged");
  prState.set(2, "merged");
  r = await advanceCampaign("camp", spec, services(targets), store);
  t.push(`5. both PRs merged → advance → **${r.status}**, migrated [${r.ledger.migrated.join(", ")}]`, "");
  const s4 = r.status === "completed" && r.ledger.migrated.length === 4;
  return {
    ok: s1 && s2 && s3 && s4, detail: "pilot gate → batch 1 → batch 2 → merge → completed",
    artifacts: [{ kind: "transcript", path: "lifecycle.md", contents: t.join("\n") }],
  };
});

// ─────────────────────────── Run, report, emit ───────────────────────────

const results = [];
for (const s of scenarios) {
  try {
    const r = await s.run();
    results.push({ ...s, ...r });
  } catch (e) {
    results.push({ ...s, ok: false, status: "ERROR", detail: e instanceof Error ? e.message : String(e), artifacts: [] });
  }
}

const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
console.log("\nloopy dogfood — all loops, real example inputs\n");
console.log(pad("loop", 40) + pad("outcome", 18) + "produced");
console.log("─".repeat(104));
for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${pad(r.id, 38)}${pad(r.status, 18)}${(r.detail ?? "").slice(0, 46)}`);
}
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log("─".repeat(104));
console.log(`\n${passed}/${results.length} passed${failed ? `, ${failed} FAILED` : ""}.\n`);

const emitIdx = process.argv.indexOf("--emit");
if (emitIdx !== -1) {
  const outDir = join(repoRoot, process.argv[emitIdx + 1] ?? "demos");
  rmSync(outDir, { recursive: true, force: true });
  const slug = (id) => id.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const r of results) {
    const dir = join(outDir, slug(r.id));
    mkdirSync(dir, { recursive: true });
    for (const a of r.artifacts ?? []) {
      const rel = a.kind === "file" ? join("produced", a.path) : a.path;
      const p = join(dir, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, a.contents.endsWith("\n") ? a.contents : a.contents + "\n");
    }
  }
  writeFileSync(join(outDir, "README.md"), renderGallery(results, slug));
  console.log(`Wrote demo artifacts to ${outDir}\n`);
}

function renderGallery(results, slug) {
  const date = new Date().toISOString().slice(0, 10);
  const out = [
    "# loopy demos — every loop, real produced artifacts",
    "",
    `> Auto-generated by \`npm run dogfood -- --emit demos\` on ${date}. Each loop below`,
    "> was run end-to-end on a realistic example input; the files under each folder are the",
    "> **actual** output the loop produced (the PR file changes, advisory comment, or",
    "> long-horizon lifecycle transcript). No hand-editing.",
    "",
    `**${results.filter((r) => r.ok).length}/${results.length} scenarios passed.**`,
    "",
    "| Loop | Example input | Outcome | Produced artifact |",
    "| ---- | ------------- | ------- | ----------------- |",
  ];
  for (const r of results) {
    const files = (r.artifacts ?? []).map((a) => {
      const rel = a.kind === "file" ? `produced/${a.path}` : a.path;
      return `[\`${a.path}\`](${slug(r.id)}/${rel})`;
    });
    const outcome = r.status === "lifecycle" ? "✅ lifecycle" : r.status === "guidance" ? "ℹ️ guidance" : `✅ ${r.status}`;
    out.push(`| \`${r.id}\` | ${r.input} | ${outcome} | ${files.join(" · ") || "_(guidance only)_"} |`);
  }
  out.push("");
  return out.join("\n");
}

process.exit(failed ? 1 : 0);
