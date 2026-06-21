# Delta: Test Coverage Backfill Loop

**Change ID:** `add-test-coverage-loop`
**Affects:** `loops/test-coverage/`, loop catalog

---

## ADDED

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

### Requirement: Self-Validating Output

Generated tests are only proposed when they pass and increase coverage.

#### Scenario: Tests proposed only when they help
- GIVEN the AI step generated candidate tests
- WHEN the loop validates them
- THEN it opens a PR only if the suite passes and coverage rises; otherwise no output

## MODIFIED

(None)

## REMOVED

(None)
