# loopy Roadmap

Derived from the research catalog
([`research/loop-use-cases.md`](research/loop-use-cases.md)) and the "top 5 after
auto-docs" shortlist. The shared core (contract, runner, guardrails, manifest)
and the GitHub adapter (PR publishing + REST client) are reused by every loop.

## Implemented (specs are source of truth)

| Loop | Spec | `act` style | Status |
|------|------|-------------|--------|
| `auto-docs` | [`specs/auto-docs-loop.md`](specs/auto-docs-loop.md) | AI (injected) | ✅ done |
| `dep-updates` | [`specs/dep-updates-loop.md`](specs/dep-updates-loop.md) | deterministic | ✅ done |
| `changelog` | [`specs/changelog-loop.md`](specs/changelog-loop.md) | deterministic | ✅ done |

## Planned (proposals in `changes/`)

| Loop | Proposal | Why not yet built |
|------|----------|-------------------|
| `pr-review` | [`changes/add-pr-review-loop`](changes/add-pr-review-loop/proposal.md) | Needs a **comment output channel** (core extension) before the loop |
| `test-coverage` | [`changes/add-test-coverage-loop`](changes/add-test-coverage-loop/proposal.md) | Needs coverage-tool integration + ability to run the suite to self-validate |
| `security-remediation` | [`changes/add-security-remediation-loop`](changes/add-security-remediation-loop/proposal.md) | Needs scanner (SCA/SAST) integration + false-positive filtering |

These three are blocked on **external boundaries** (a new output channel,
coverage tooling, security scanners) that cannot be meaningfully validated in
this repository today, so they are specified as OpenSpec change proposals and
will be implemented once their boundaries are available. Each follows the same
cycle the implemented loops did: `/openspec-proposal` → `/openspec-apply` →
`/openspec-archive`.

## Backlog (catalogued, not yet proposed)

From the research catalog: API reference sync, docstring coverage, deprecated-API
codemod migration, dead-code cleanup, lint/format autofix, type-coverage ratchet,
flaky-test quarantine, issue triage, stale management, release PR, org-wide config
sync, SDK/spec regeneration, i18n key sync, secret-leak response, license/SBOM
compliance, IaC drift, CI cost watch.

## Recommended build order

1. `pr-review` — highest-frequency trigger, zero blast radius (advisory); the
   output-channel extension it unlocks benefits future comment/issue loops.
2. `test-coverage` — strong ROI, self-validating artifact.
3. `security-remediation` — high value; reuses dep-updates semver for bumps.
