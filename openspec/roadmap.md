# loopy Roadmap

Derived from the research catalog
([`research/loop-use-cases.md`](research/loop-use-cases.md)) and the "top 5 after
auto-docs" shortlist. The shared core (contract, runner, guardrails, manifest)
and the GitHub adapter (PR publishing, comment posting, REST client) are reused
by every loop.

## Implemented — the shortlist is complete (specs are source of truth)

| Loop | Spec | `act` style | Output |
|------|------|-------------|--------|
| `auto-docs` | [`specs/auto-docs-loop.md`](specs/auto-docs-loop.md) | AI (injected) | PR |
| `dep-updates` | [`specs/dep-updates-loop.md`](specs/dep-updates-loop.md) | deterministic | PR |
| `changelog` | [`specs/changelog-loop.md`](specs/changelog-loop.md) | deterministic | PR |
| `pr-review` | [`specs/pr-review-loop.md`](specs/pr-review-loop.md) | AI (injected) | comment |
| `test-coverage` | [`specs/test-coverage-loop.md`](specs/test-coverage-loop.md) | AI + self-validation | PR |
| `security-remediation` | [`specs/security-remediation-loop.md`](specs/security-remediation-loop.md) | hybrid | PR (human-gated) |
| `kb-gap` | [`specs/kb-gap-loop.md`](specs/kb-gap-loop.md) | AI | PR |

All six follow the same contract and reuse the core unchanged. `pr-review`
introduced the **comment output channel**; `test-coverage` introduced the
**self-validation gate** (propose only if the suite passes and coverage rises).

Each loop's external dependency (AI doc writer, registry, commit source, PR diff,
coverage report, scanner findings, fixer) is an **injected boundary**, so the
loops are fully unit-tested with fakes. Wiring the real boundaries (live GitHub
API, npm registry, coverage tool, SCA/SAST scanner) is consumer configuration.

## Platform

| Capability | Spec | Status |
|------------|------|--------|
| 1-click loop import (`loopy add/list/run`) | [`specs/cli.md`](specs/cli.md) | ✅ done |
| CI gate (typecheck/lint/test/build) | [`specs/ci.md`](specs/ci.md) | ✅ done |
| AI provider (OpenRouter / OpenAI-compatible) | [`specs/ai-provider.md`](specs/ai-provider.md) | ✅ done (auto-docs + pr-review turnkey) |
| pr-review runtime (GitHub diff provider) | [`specs/pr-review-loop.md`](specs/pr-review-loop.md) | ✅ done |
| Long-horizon primitives (state, gates, resumable plans) | [`specs/long-horizon-runtime.md`](specs/long-horizon-runtime.md) | ✅ done |

## Next horizon: product-level loops

Beyond repo maintenance, [`research/product-level-loops.md`](research/product-level-loops.md)
explores **complex, long-horizon loops** that act on the product/business
(discovery, experimentation, incidents, analytics, retention, support, FinOps,
compliance). These need new framework primitives — durable state/memory,
resumable multi-step orchestration, long-horizon scheduling, human-approval
gates, and non-PR output adapters.

**Delivered so far:** the **long-horizon primitives** (durable state, approval
gates, resumable plans) in `src/core/longrun/`; the **KB-Gap Self-Heal** loop
(first product-level wedge, turnkey); and the **Experiment Lifecycle
Orchestrator** ([`specs/experiment-orchestrator.md`](specs/experiment-orchestrator.md))
— the flagship long-horizon loop on `runPlan` + gates + state (design → approve →
launch → bake → readout → decide). The **Metric Anomaly** and **Incident Follow-up** loops are now shipped
(deterministic, turnkey). Remaining candidates on the same primitives: Churn →
Intervention, Voice-of-Customer miner. Cross-cutting follow-ups: non-PR output
adapters (issue tracker, experimentation platform, dashboards) and a
`loopy advance <plan>` CLI verb for long-horizon loops.

A **project landing page** ships under `site/` (deployed to GitHub Pages via
`.github/workflows/pages.yml`).

## Backlog (catalogued, not yet proposed)

From the research catalog, the next candidates: API reference sync, docstring
coverage, deprecated-API codemod migration, dead-code cleanup, lint/format
autofix, type-coverage ratchet, flaky-test quarantine, issue triage, stale
management, release PR, org-wide config sync, SDK/spec regeneration, i18n key
sync, secret-leak response (alert-first), license/SBOM compliance, IaC drift,
CI cost watch.

Each new loop follows the cycle the six implemented loops did:
`/openspec-proposal` → `/openspec-apply` → `/openspec-archive`.
