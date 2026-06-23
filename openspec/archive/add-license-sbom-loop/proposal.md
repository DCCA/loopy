# Proposal: License/SBOM Drift Loop

**Change ID:** `add-license-sbom-loop`
**Created:** 2026-06-23
**Status:** Implementation Complete
**Completed:** 2026-06-23

---

## Problem Statement

A new dependency can quietly introduce a disallowed license (copyleft, unknown).
A loop that classifies dependency licenses against an allowlist and flags
violations keeps the supply chain honest. Dogfoodable — loopy has npm deps.

## Proposed Solution

Add `loops/license-sbom-drift/`: classify each dependency's license (allowed /
denied / unknown) against an allowlist and, when violations exist, open a PR
writing a license report flagging them for review. Deterministic; the SBOM
(dependency→license list) is an injected boundary.

## Scope

### In Scope
- `loops/license-sbom-drift/` (hooks/licenses.ts, index.ts, loop.yaml, playbook, README)
- Catalog entry + `loopy run license-sbom-drift` (SBOM from `LOOPY_SBOM_FILE`)
- Unit tests

### Out of Scope
- Run-over-run SBOM diff + persisted approved exceptions (StateStore enhancement, future)
- Generating the SBOM itself (injected boundary)

## Success Criteria

- [ ] Classifies licenses vs the allowlist (allowed/denied/unknown), case-insensitive.
- [ ] Violations present → report PR; all-allowed → no PR (fail-safe).
- [ ] Report lists the full posture and flags the violations.

## Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| False "denied" on SPDX variants | Med | Low | Normalize; configurable allowlist |
| Unknown-license handling | Med | Low | Treated as a violation to review, not auto-blocked |

---

## Archive Information

**Archived:** 2026-06-23
**Outcome:** Successfully implemented
**Verification:** typecheck + lint + 161 tests + build; release-train dogfooded on loopy's own repo (dry-run)
