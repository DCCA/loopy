# Implementation Tasks: Security Remediation Loop

**Change ID:** `add-security-remediation-loop`
**Status:** Planned (not yet started)

---

## Phase 1: Detection
- [ ] 1.1 Scanner-findings boundary (injectable SCA/SAST)
- [ ] 1.2 Severity-threshold + false-positive filter
- [ ] 1.3 Tests with fake findings

## Phase 2: Fix & Loop
- [ ] 2.1 Fix step: dependency bump (reuse dep-updates semver) + codemod/AI boundary
- [ ] 2.2 `loop.yaml` + loop factory (detect findings → fix → PR)
- [ ] 2.3 playbook.md (human-gated, never auto-merge)
- [ ] 2.4 Tests (findings present/filtered/none)

## Phase 3: Integration
- [ ] 3.1 Export loop; verify fail-safe + human-gated
- [ ] 3.2 Loop README

---

## Completion Checklist
- [ ] All phases complete and validated
- [ ] Ready for `/openspec-archive`
