# Dependency Major Migration Loop Specification

> Source of truth. Established by change `add-dep-major-migration` (2026-06-23).

## Requirements

### Requirement: Verify-gated single major bump

The dep-major-migration loop migrates one major dependency bump on `runPlan` (verify → approve → apply), persisting progress under `plan:<planId>` in the `StateStore`. It verifies the consumer build/tests against the candidate version, gates a green result behind a human approval, and only then emits the manifest bump. A red build is never gated and never proposed.

#### Scenario: Green build, gated
- GIVEN verification of the candidate version passes and the approval gate is pending
- WHEN the plan advances
- THEN it blocks on the `<planId>:approve` gate

#### Scenario: Approved bump
- GIVEN a human approves the gate
- WHEN the plan advances
- THEN it completes and emits a manifest change set pinning the package to `^<toVersion>`

#### Scenario: Red build
- GIVEN verification of the candidate version fails
- WHEN the plan advances
- THEN it completes with decision "hold", emits no bump, surfaces the log, and never requests the gate
