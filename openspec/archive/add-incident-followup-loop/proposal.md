# Proposal: Incident Follow-up Loop

**Change ID:** `add-incident-followup-loop`
**Created:** 2026-06-22
**Status:** Implementation Complete
**Completed:** 2026-06-22

---

## Problem Statement

Postmortem action items quietly fall off, and the same root causes recur across
incidents without anyone noticing the pattern. A deterministic sweep that surfaces
overdue items and recurring root causes keeps reliability honest.

## Proposed Solution

Add `loops/incident-followup/`: deterministically sweep an injected incident
source for overdue action items and cluster incidents by root cause to flag
recurrences, then write a follow-up digest as a PR. No AI; data is an injected
boundary. Reuses core runner/guardrails/GitHub adapter; turnkey via a file source.

- **detect** — overdue open action items + root-cause clusters ≥ `minRecurrence`.
- **act** — write a deterministic digest to `reports/incident-followup.md`.
- **output** — one PR; **guardrails** allowlist `reports/**`.

## Scope

### In Scope
- `loops/incident-followup/` (hooks/incidents.ts, index.ts, loop.yaml, playbook, README)
- Catalog entry + `loopy run incident-followup` (incidents from `LOOPY_INCIDENTS_FILE`)
- Unit tests

### Out of Scope
- Live incident-tool connectors (incident.io/Rootly) — injected boundary
- Auto-nudging owners / auto-filing tickets (future, gated)

## Success Criteria

- [ ] Surfaces overdue open items and recurring root causes.
- [ ] Nothing overdue/recurring → no PR (fail-safe).
- [ ] Writes a digest within the `reports/**` allowlist.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Nag fatigue | Med | Low | Single overwritten digest; skipIfOpenPr |
| Bad clustering | Med | Low | Deterministic cause normalization + min threshold |

---

## Archive Information

**Archived:** 2026-06-22
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 126 tests + build all passing
