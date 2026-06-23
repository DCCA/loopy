# Complex Loops: Research Report (deep dive #3)

> New, **more complex** loop candidates that exploit loopy's long-horizon
> primitives (durable `StateStore`, human `Gate`, resumable `runPlan`) and/or
> staged cross-PR campaigns. Excludes the 10 already-shipped loops. 2026-06-23.

## A. What makes a loop "complex"

A loop is complex when one run can't honestly finish: it must **remember across
runs** (a flake score, a campaign ledger, an eval/SBOM baseline), **proceed in
stages** (codemod → test → staged PR → bake → verify), and/or **pause on a human**
before something irreversible (cut a release, delete a resource, switch a prod
model). The hardest are **cross-PR campaigns**: work fanned across many PRs,
tracked/throttled/resumed against a durable ledger.

## B. Catalog (16 new candidates)

**Flaky-test / CI reliability:** `flake-quarantine` (stateful flake scoring →
gated quarantine PR), `test-impact-budget` (timing baselines → split slow tests).
**Migration campaigns (cross-PR, staged):** `codemod-campaign` (drive a codemod
across the codebase in throttled PR batches, ledger in StateStore, advance via
runPlan), `dep-major-migration` (major bump: codemod → test → gated PR),
`api-deprecation-rollout` (announce → track callers → migrate → gated remove).
**LLMOps / evals:** `prompt-eval-gate` (promptfoo-style regression vs baseline),
`model-upgrade-migration` (golden-set diff → gated model switch), `eval-set-drift`
(production inputs drift from the eval set). **Release:** `release-train`
(rolling Release PR from conventional commits; merge = cut). **Quality budgets:**
`perf-budget`, `a11y-baseline`, `i18n-drift` (baseline known debt; fail only on
new regressions; ratchet on improvement). **Governance/supply-chain:**
`license-sbom-drift` (SBOM diff → gated license exceptions), `data-contract-guard`
(Buf-style breaking-change gate on a schema). **Ops:** `runbook-freshness`,
`cost-guardrail` (idle-streak → grace window → gated remediation).

## C. Ranked shortlist (score /25)

| Rank | Loop | Value | Build-feasibility | Long-horizon | Differentiation | Dogfoodable | Total |
|---|---|---|---|---|---|---|---|
| 1 | flake-quarantine | 5 | 5 | 4 | 5 | yes | **24** |
| 2 | codemod-campaign | 5 | 4 | 5 | 5 | yes | **23** |
| 3 | release-train | 5 | 5 | 4 | 3 | yes | **22** |
| 4 | prompt-eval-gate | 4 | 5 | 4 | 4 | yes | **21** |
| 5 | license-sbom-drift | 4 | 5 | 4 | 4 | yes | **21** |
| 6 | data-contract-guard | 4 | 5 | 4 | 4 | partial | **21** |
| 7 | model-upgrade-migration | 4 | 4 | 5 | 4 | yes | **21** |
| 8 | perf-budget | 4 | 5 | 3 | 3 | yes | **20** |

## D. Top-5 implementation sketches

1. **flake-quarantine** — boundaries: `TestResultSource.recent()`, a `StateStore`
   (per-test history), `now()`. Deterministic flake score (status flips over a
   decayed window, min-observations), quarantine cap. Output: PR editing
   `quarantine.json` + `reports/flaky-tests.md`; un-quarantine after N clean runs.
   Test with a fake flipping history + memory store. **Dogfoodable** (loopy has a
   vitest suite).
2. **codemod-campaign** — boundaries: `Codemod.apply`, `Runner.test`, a PR ledger,
   StateStore, Gate, runPlan. Deterministic batch selection/throttle/burndown; one
   PR per batch; `waiting` over the open-PR cap; pilot batch gated. **Dogfoodable.**
3. **release-train** — boundaries: commits-since-tag (reuse conventional hooks),
   current version. Fully deterministic semver bump + changelog → a Release PR
   (`package.json` version + `CHANGELOG.md`). **Dogfoodable — automates loopy's own
   releases.**
4. **prompt-eval-gate** — boundaries: model + grader (reuse the AI client),
   StateStore baseline, Gate. Deterministic diff vs baseline → blocking PR comment;
   baseline promotion gated. **Dogfoodable** (loopy ships AI loops).
5. **license-sbom-drift** — boundaries: `SbomSource.current()` (parse lockfile),
   allowlist, StateStore (prior SBOM + approved exceptions), Gate. Deterministic
   diff + license classification → blocking comment / report PR. **Dogfoodable**
   (loopy has npm deps).

## E. Anti-patterns (stateful / staged loops)

- **Campaign runaway** — cap concurrent open PRs + max batches/run; reconcile vs
  real PR state and return `waiting` instead of pushing more.
- **Stale/drifting state** — treat external systems as source of truth, reconcile
  every run, decay old observations; never act on state without re-detecting.
- **Partial-rollout corruption** — idempotent, re-runnable steps; only advance
  `completedSteps`/baselines on confirmed `done`; never persist a baseline before
  the Gate.
- **Gate bypass** — destructive steps re-consult the Gate every run; encode
  invariants (e.g. callers==0 AND approved) as preconditions.
- **Approval staleness** — scope Gate ids to a content hash of what was approved.
- **Noise thrash** — require min-observations / margins; approval to *grow* a debt
  baseline, free to shrink.

## F. Sources

- [Trunk — Flaky Test Detection & Quarantine](https://trunk.io/flaky-tests) · [Atlassian — Taming Test Flakiness](https://www.atlassian.com/blog/atlassian-engineering/taming-test-flakiness-how-we-built-a-scalable-tool-to-detect-and-manage-flaky-tests)
- [Sourcegraph Batch Changes](https://sourcegraph.com/batch-changes) · [OpenRewrite recipes](https://docs.openrewrite.org/reference/all-recipes)
- [Renovate — Dependency Dashboard](https://docs.renovatebot.com/key-concepts/dashboard/) · [Upgrade best practices](https://docs.renovatebot.com/upgrade-best-practices/)
- [promptfoo](https://github.com/promptfoo/promptfoo) · [RETAIN — Regression-guided LLM migration (arXiv)](https://arxiv.org/pdf/2409.03928)
- [release-please-action](https://github.com/googleapis/release-please-action) · [Changesets vs semantic-release vs release-please](https://oleksiipopov.com/blog/npm-release-automation/)
- [Lighthouse CI budgets](https://unlighthouse.dev/learn-lighthouse/lighthouse-ci/budgets) · [Chromatic — a11y regression baselines](https://www.chromatic.com/blog/sneak-peek-accessibility-regression-testing/)
- [Buf — Detecting breaking changes](https://buf.build/docs/breaking/) · [Dependency-Track — License policy](https://docs.dependencytrack.org/usage/policy-compliance/)
- [lingualdev/i18n-check](https://github.com/lingualdev/i18n-check) · [FinOps — Governance, Policy & Risk](https://www.finops.org/framework/capabilities/governance-policy-risk/)
