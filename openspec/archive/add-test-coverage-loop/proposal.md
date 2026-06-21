# Proposal: Test Coverage Backfill Loop

**Change ID:** `add-test-coverage-loop`
**Created:** 2026-06-21
**Status:** Implementation Complete
**Completed:** 2026-06-21

---

## Problem Statement

- New or changed code often ships with coverage gaps that erode the safety net.
- The detector is cheap and deterministic (coverage delta on changed lines), and
  the generated artifact is self-validating: tests must pass and raise coverage.

## Proposed Solution

Add `loops/test-coverage/`: read a coverage report, find changed lines lacking
coverage, have an AI step (injected) generate tests for them, run the suite, and
open a PR **only if** the new tests pass and coverage increases.

## External Boundaries (why this is planned, not yet built)

Requires integration with a coverage tool (e.g. `coverage-final.json` / lcov)
and the ability to execute the project's test suite to self-validate generated
tests. Both are environment-specific and cannot be meaningfully validated in
this repo today; they are modeled as injected boundaries.

## Scope

### In Scope
- Coverage-report reader boundary (injectable)
- Changed-lines-without-coverage detector
- AI test-generator boundary (injected) + playbook
- Self-validation gate (tests pass AND coverage rises) before output
- Tests with a fake coverage report + fake generator

### Out of Scope
- Choosing/installing a coverage tool for the consumer
- Mutation testing; assertion-quality judgement (human review)

## Success Criteria

- [ ] Detects changed lines lacking coverage from a report.
- [ ] Generated tests are only proposed if they pass and raise coverage.
- [ ] No PR when there is no coverage gap (fail-safe).

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low-quality/assertion-free tests | Med | Med | Self-validation gate + human review |
| Flaky generated tests | Med | Med | Require passing run before output |

---

## Archive Information

**Archived:** 2026-06-21
**Outcome:** Successfully implemented (injected boundaries, validated with fakes)
**Verification:** typecheck + lint + 54 tests + build all passing
