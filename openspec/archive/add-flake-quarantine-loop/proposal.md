# Proposal: Flake-Quarantine Loop

**Change ID:** `add-flake-quarantine-loop`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Problem Statement

Flaky tests erode trust in CI. Detecting them needs **memory across runs** (a
test's pass/fail history), which no loop has used yet. This is the highest-ranked
new complex loop and the first consumer of loopy's durable `StateStore`.

## Proposed Solution

Add `loops/flake-quarantine/`: accumulate test-result history in a `StateStore`,
score flakiness deterministically (status flips over a window, min observations),
and open a PR updating a `quarantine.json` manifest + a `reports/flaky-tests.md`
leaderboard. Newly-flaky tests are quarantined; recovered tests are
un-quarantined. Reuses the core runner, guardrails, and GitHub adapter.

- **detect** — merge recent results into history; flag tests crossing the flake threshold (not already quarantined) and recovered tests still quarantined.
- **act** — persist merged history to the StateStore; write the updated quarantine list + report.
- **output** — one PR; **guardrails** allowlist `quarantine.json` + `reports/**`. The PR review is the human gate.

## Scope

### In Scope
- `loops/flake-quarantine/` (hooks/flake.ts, index.ts, loop.yaml, playbook, README)
- StateStore-backed history (first loop to use the `longrun` StateStore)
- Catalog entry + `loopy run flake-quarantine` (results from `LOOPY_TEST_RESULTS_FILE`, file-backed state)
- Unit tests with a fake source + memory StateStore

### Out of Scope
- Live CI-results connectors (injected boundary)
- An explicit approval Gate before quarantine (PR review serves as the gate for v1)

## Success Criteria

- [ ] Flipping tests with enough observations are flagged; all-fail (broken) and stable tests are not.
- [ ] Nothing actionable → no PR (fail-safe).
- [ ] Quarantine PR updates `quarantine.json` (add flaky, remove recovered) within the allowlist.
- [ ] Merged history is persisted to the StateStore.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Masking real breakage | Med | High | all-fail excluded; min-observations; PR review; report surfaces what's quarantined |
| Noise thrash | Med | Low | min-observations + threshold; window decay |
| Stale state | Low | Med | history keyed/deduped by run id; recompute each run |

---

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 161 tests + build; release-train dogfooded on loopy's own repo (dry-run)
