# Auto-Docs Loop Specification

> Source of truth for loopy's loop framework and the auto-docs loop.
> Established by change `add-auto-docs-loop` (2026-06-21).

## Requirements

### Requirement: Loop Contract & Runner

Loopy defines a portable loop contract — `trigger → detect → act → output →
guardrails` — and a loop-agnostic runner that executes any loop described by a
`loop.yaml` manifest while enforcing its guardrails.

#### Scenario: Runner executes a loop from its manifest
- GIVEN a valid `loop.yaml` describing trigger, detect, act, output, and guardrails
- WHEN the runner is invoked for that loop
- THEN it executes the phases in order and applies the declared guardrails,
  without containing any loop-specific logic of its own

#### Scenario: Guardrails block out-of-scope changes
- GIVEN a loop run that would modify files outside the path allowlist or exceed
  the max-files cap
- WHEN the runner evaluates the proposed output
- THEN the run fails safe and produces no output (no partial application)

---

### Requirement: Auto-Docs Drift Detection

The auto-docs loop detects when documentation has drifted from the code surface
it describes and only proceeds to the `act` phase when drift is found.

#### Scenario: Drift detected
- GIVEN a repo whose public code surface has changed but whose docs have not
- WHEN the auto-docs `detect` phase runs
- THEN it reports that documentation work is needed and identifies the affected docs

#### Scenario: No drift (fail-safe / idempotent)
- GIVEN a repo whose docs are already in sync with the code surface
- WHEN the auto-docs `detect` phase runs
- THEN it reports no work needed and the loop produces no pull request

---

### Requirement: PR-Based Output with Idempotency

The auto-docs loop's output is a reviewable pull request; it never commits
directly to the default branch and never opens duplicate PRs.

#### Scenario: Updated docs delivered as a PR
- GIVEN drift was detected and the `act` phase updated the affected docs
- WHEN the loop produces output
- THEN it opens a single pull request containing only the doc changes, for human review

#### Scenario: Skip when an auto-docs PR is already open
- GIVEN an open auto-docs pull request already exists
- WHEN the loop runs again
- THEN it skips creating a new PR

---

### Requirement: GitHub Action Adapter

The auto-docs loop can run via a GitHub Action adapter on a schedule and on
manual dispatch, binding the runner to CI and handling PR creation.

#### Scenario: Scheduled run
- GIVEN the GitHub Action is configured with a cron schedule
- WHEN the schedule fires
- THEN the adapter invokes the runner for the auto-docs loop in CI

#### Scenario: Manual run
- GIVEN a maintainer triggers `workflow_dispatch`
- WHEN the workflow starts
- THEN the adapter runs the auto-docs loop on demand
