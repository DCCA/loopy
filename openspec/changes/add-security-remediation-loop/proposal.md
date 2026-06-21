# Proposal: Security Remediation Loop

**Change ID:** `add-security-remediation-loop`
**Created:** 2026-06-21
**Status:** Planned

---

## Problem Statement

- Vulnerable dependencies and SAST findings pile up; manual remediation lags.
- Detection is deterministic (scanner output above a severity threshold); the
  fix is a hybrid AI/codemod step. High value, increasingly expected.

## Proposed Solution

Add `loops/security-remediation/`: ingest scanner findings (SCA/SAST, injected),
filter false positives and by severity, apply a fix (dependency bump or codemod;
AI for edge cases), and open a PR. **Human-gated merge**, never auto-merge.

## External Boundaries (why this is planned, not yet built)

Requires integration with security scanners (advisory DBs, Semgrep/SCA output)
and a vetted false-positive filter — environment- and policy-specific, not
validatable here. Modeled as injected boundaries. Complements (does not duplicate)
the dep-updates loop: this one is severity-driven, that one is freshness-driven.

## Scope

### In Scope
- Scanner-findings boundary (injectable) + severity threshold filter
- False-positive filtering step before any PR
- Fix step (dependency bump reuses dep-updates semver; codemod/AI for code fixes)
- PR output, human-gated; tests with fake findings

### Out of Scope
- Auto-merge of security fixes; secret rotation (see secret-leak loop, separate)
- Shipping/choosing a specific scanner for the consumer

## Success Criteria

- [ ] Opens a PR only for findings above the configured severity threshold.
- [ ] False positives are filtered before a PR is opened.
- [ ] Never auto-merges; output is always human-reviewed.
- [ ] No findings → no PR (fail-safe).

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| False-positive PR noise | Med | Med | Filter step + severity threshold |
| Incorrect fix | Low | High | Human-gated merge; CI gate; one finding per PR |
| Secret exposure in PR | Low | High | Out of scope here; handled by a secret-leak loop, alert-first |
