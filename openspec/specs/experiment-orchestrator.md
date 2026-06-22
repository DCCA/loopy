# Experiment Lifecycle Orchestrator Specification

> Source of truth. Established by change `add-experiment-orchestrator` (2026-06-22).
> The first long-horizon loop built on the `longrun` primitives (state, gates,
> resumable plans).

## Requirements

### Requirement: Resumable Experiment Lifecycle

The orchestrator advances an experiment through design → approve → launch → bake
→ readout → decide as a resumable plan, persisting progress and pausing at human
gates and the bake wait.

#### Scenario: Design approval gate
- GIVEN a new hypothesis
- WHEN the plan is advanced
- THEN it produces a design and blocks awaiting design approval, resuming on approval

#### Scenario: Long-horizon bake
- GIVEN an approved, launched experiment with no results yet
- WHEN the plan is advanced
- THEN it waits, and a later advance completes the bake once results are available

#### Scenario: Human ship decision
- GIVEN baked results
- WHEN the plan is advanced
- THEN it produces a readout and blocks at the decision gate, completing with the recommended decision on approval

#### Scenario: Rejected design short-circuits
- GIVEN the design approval is rejected
- WHEN the plan is advanced
- THEN it completes with finalDecision "rejected" and never launches
