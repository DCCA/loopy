# Proposal: KB-Gap Self-Heal Loop

**Change ID:** `add-kb-gap-loop`
**Created:** 2026-06-22
**Status:** Implementation Complete
**Completed:** 2026-06-22

---

## Problem Statement

Recurring support tickets often point at missing or unclear documentation.
Closing those gaps is high-ROI (self-service ≈ $0.25 vs. $12–16 per
human-handled interaction) but tedious and reactive. It's the best **wedge** into
product-level loops: a "KB article PR" is close to a code PR, so it fits loopy's
existing detect → draft → reviewable-artifact model.

## Proposed Solution

Add `loops/kb-gap/`: detect doc gaps from recurring resolved tickets (topics with
enough volume that aren't covered by the KB), draft KB articles via an injected
AI writer, and open a PR. Deterministic detection + injected AI `act`; reuses the
core runner, guardrails, GitHub adapter, and the OpenRouter AI provider.

- **detect** — group resolved tickets by topic, find topics ≥ `minTickets` not in
  the covered set; work needed if any gap exists.
- **act** — an AI article writer drafts/updates KB markdown for the gaps.
- **output** — one PR; **guardrails** allowlist the docs/KB path.

## Scope

### In Scope
- `loops/kb-gap/` (loop.yaml, playbook.md, README, hooks/gaps.ts, index.ts)
- Injected boundaries: ticket source, covered-topics, article writer (AI)
- An `articleWriter` adapter on the AI provider; wire `loopy run kb-gap`
- Catalog entry + tests

### Out of Scope
- Live ticket-system connectors (Zendesk/Intercom) — modeled as an injected boundary
- Deflection-rate measurement loop (future)

## Impact Analysis

| Component | Change | Details |
|-----------|--------|---------|
| Loops | Yes | new `loops/kb-gap/` |
| AI provider | Yes | `createArticleWriter` adapter |
| CLI | Yes | catalog entry + `run` wiring |
| Core | No | reuses runner/guardrails |

## Success Criteria

- [ ] Detects topic gaps from recurring tickets not covered by the KB.
- [ ] No gaps → no PR (fail-safe).
- [ ] Drafts KB articles and opens one PR within the docs allowlist.
- [ ] `loopy add kb-gap` scaffolds the workflow; `loopy run kb-gap` is turnkey with an AI key.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Wrong/conflicting docs published | Med | Med | PR review gate; allowlist; writer returns [] when unsure |
| Deflecting tickets that need a human | Low | Med | Out of scope here; this only drafts docs |
| Noisy topic clustering | Med | Low | `minTickets` threshold; deterministic normalization |

---

## Archive Information

**Archived:** 2026-06-22
**Outcome:** Successfully implemented (built in parallel via subagents, integrated centrally)
**Verification:** typecheck + lint + 108 tests + build all passing
