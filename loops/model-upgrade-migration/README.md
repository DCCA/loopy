# model-upgrade-migration loop

Safely migrate to a new model version behind a **regression gate**. A long-horizon
loop on the `longrun` primitives: it evaluates a golden set on the current and
candidate models, diffs them, and proposes the model-id bump **only after human
approval**.

Programmatic (like the experiment orchestrator): `advanceModelUpgrade(...)` runs a
resumable plan and pauses at the approval gate.

## The plan

```
baseline → candidate → diff → approve (gate) → apply
```

| Step | What happens |
|------|--------------|
| **baseline** | Run the golden set on the current model → scorecard |
| **candidate** | Run it on the candidate model → scorecard |
| **diff** | Regressions (passed on current, fails on candidate) + score delta |
| **approve** | **blocked** until a human approves the switch |
| **apply** | On approval, emit the model-id bump (`result.bump`); on rejection, hold |

## Boundaries (injected, testable)

- `services.evaluate(modelId)` — runs the golden set on a model → `Scorecard`
  (reuses the prompt-eval `Scorecard`/`regressions`)
- a `StateStore` carries plan progress; the gate is created from it

## Status

Programmatic. `result.bump` is the model-id change set; a CLI verb / PR adapter to
open it is a follow-up (shared with the experiment orchestrator and campaign).
