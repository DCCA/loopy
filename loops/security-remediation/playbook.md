# Security Remediation Playbook

This loop ingests scanner findings (SCA/SAST), filters by severity and false
positives, and proposes fixes via a **human-gated** pull request. The fix step
may be deterministic (a dependency bump) or a codemod/AI edit for code findings.

The fixer is supplied as `services.fixer` (see `index.ts`). It receives one
finding and returns the file changes that remediate it (or nothing).

## Instructions for the fix step

1. **Prefer the minimal, targeted fix** — bump the vulnerable dependency to the
   first non-vulnerable version, or apply the smallest code change that closes
   the finding.
2. **One concern at a time.** Keep each fix scoped to its finding.
3. **Never include secrets** in the change or summary.
4. Return file changes; return nothing if no safe automatic fix exists (the
   finding is then listed for manual review).

## Guardrails (enforced)

- Acts only on findings at or above `severityThreshold`; false positives excluded.
- Output is a PR for **human review** — this loop never auto-merges.
- Secret rotation is out of scope here (handled alert-first by a secret-leak loop).
