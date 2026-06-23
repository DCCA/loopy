# Flake-Quarantine Loop Specification

> Source of truth. Established by change `add-flake-quarantine-loop` (2026-06-23).

---

## ADDED

### Requirement: Stateful Flake Scoring

The flake-quarantine loop accumulates test-result history across runs in the
durable StateStore and scores flakiness deterministically.

#### Scenario: Flaky test flagged
- GIVEN a test whose status flips across enough observations (and is not always failing)
- WHEN detect runs
- THEN it reports the test should be quarantined

#### Scenario: Broken or stable test not flagged
- GIVEN a test that always fails, or is consistently stable, or has too few observations
- WHEN detect runs
- THEN it is not flagged as flaky

---

### Requirement: Quarantine Manifest Output

The loop opens a PR updating the quarantine manifest (adding flaky tests,
removing recovered ones) and a leaderboard report, and persists merged history.

#### Scenario: Quarantine updated
- GIVEN newly-flaky and/or recovered tests
- WHEN the loop acts
- THEN it writes an updated `quarantine.json` and report, and saves merged history to the StateStore

#### Scenario: Nothing actionable
- GIVEN no new flaky tests and no recovered tests
- WHEN detect runs
- THEN no PR is produced

## MODIFIED

(None)

## REMOVED

(None)
