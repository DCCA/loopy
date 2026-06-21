# Test Coverage Backfill Loop Specification

> Source of truth. Established by change `add-test-coverage-loop` (2026-06-21).

## Requirements

### Requirement: Coverage Gap Detection

The loop reads a coverage report and identifies changed lines that lack
coverage, only proceeding when a gap exists.

#### Scenario: Gap found
- GIVEN a coverage report showing changed lines with no coverage
- WHEN detect runs
- THEN it reports work needed and identifies the gap

#### Scenario: No gap
- GIVEN changed lines are already covered
- WHEN detect runs
- THEN it reports no work needed and produces no PR

---

### Requirement: Self-Validating Output

Generated tests are only proposed when they pass and increase coverage.

#### Scenario: Tests proposed only when they help
- GIVEN the AI step generated candidate tests
- WHEN the loop validates them
- THEN it opens a PR only if the suite passes and coverage rises; otherwise no output

#### Scenario: No tests generated
- GIVEN the generator returns no tests for the gaps
- WHEN the loop acts
- THEN it produces no PR
