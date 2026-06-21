# Implementation Tasks: Security Remediation Loop

**Change ID:** `add-security-remediation-loop`
**Status:** Implementation Complete

---

## Phase 1: Detection
- [x] 1.1 Scanner-findings boundary (injectable SCA/SAST)
- [x] 1.2 Severity-threshold + false-positive filter
- [x] 1.3 Tests with fake findings

## Phase 2: Fix & Loop
- [x] 2.1 Fix step: dependency bump (reuse dep-updates semver) + codemod/AI boundary
- [x] 2.2 `loop.yaml` + loop factory (detect findings → fix → PR)
- [x] 2.3 playbook.md (human-gated, never auto-merge)
- [x] 2.4 Tests (findings present/filtered/none)

## Phase 3: Integration
- [x] 3.1 Export loop; verify fail-safe + human-gated
- [x] 3.2 Loop README

---

## Completion Checklist
- [x] All phases complete and validated
- [x] Ready for `/openspec-archive`
