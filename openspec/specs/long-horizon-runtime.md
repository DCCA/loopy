# Long-Horizon Runtime Specification

> Source of truth. Established by change `add-long-horizon-runtime` (2026-06-22).
> Additive `src/core/longrun/` module; the single-shot `runLoop` path is unchanged.

## Requirements

### Requirement: Durable Loop State

loopy provides a state store so loops can persist memory across runs, with
in-memory and file-backed implementations.

#### Scenario: State survives across runs
- GIVEN a value saved under a key
- WHEN it is loaded in a later run
- THEN the same value is returned; a missing key returns null

#### Scenario: Stored values are isolated
- GIVEN a value saved to the store
- WHEN the caller mutates the object it passed or received
- THEN the stored value is unaffected

---

### Requirement: Human-Approval Gate

loopy provides an approval gate as a first-class checkpoint persisted in the
state store.

#### Scenario: Idempotent request
- GIVEN an approval is required for an id
- WHEN `require` is called more than once
- THEN the first call records a pending request and later calls return its current state

#### Scenario: Decision recorded
- GIVEN a pending approval
- WHEN it is approved or rejected
- THEN its status transitions and is readable via `get`

---

### Requirement: Resumable Multi-Step Plans

loopy can execute an ordered plan of steps, persisting progress and resuming from
the first incomplete step. Steps may complete, wait (long-horizon), or block on a
gate. Only `done` advances the plan; the step owns the wait→done transition.

#### Scenario: Plan completes
- GIVEN a plan whose steps all return done
- WHEN it runs
- THEN it reports completed and merges step memory

#### Scenario: Plan waits then resumes
- GIVEN a step returns waiting until a future time
- WHEN the plan runs
- THEN it stops as waiting, and a later run resumes from that step and completes once it returns done

#### Scenario: Plan blocks on a gate then proceeds
- GIVEN a step returns blocked on a gate
- WHEN the plan runs
- THEN it stops as blocked, and after the gate is approved a later run completes the plan
