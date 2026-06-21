# CI Specification

> Source of truth. Established by change `add-ci-workflow` (2026-06-21).

## Requirements

### Requirement: Continuous Integration Gate

The repository runs its quality gate automatically on pushes to `main` and on
pull requests.

#### Scenario: Gate runs on a pull request
- GIVEN a pull request against `main`
- WHEN CI runs
- THEN it executes typecheck, lint, tests, and build, and fails if any fail
