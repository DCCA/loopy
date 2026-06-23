# Model Upgrade Migration Playbook

Migrate to a new model version safely, gated on a golden-set regression check.
The evaluator is the injected boundary; the loop handles the diff, the human
gate, and the model-id bump.

## Behavior

1. **baseline** — run the golden eval set on the current (pinned) model.
2. **candidate** — run the same set on the candidate model.
3. **diff** — compute regressions (cases that pass now but fail on the candidate)
   and the score delta.
4. **approve** — a human reviews the diff at the gate before any switch.
5. **apply** — on approval, emit the model-id bump for a reviewable PR; on
   rejection, hold on the current model.

## Guardrails (enforced)

- The model switch is **never** automatic — it is human-gated on the diff.
- Decisions are made on a fixed golden set (pin the candidate to avoid a moving
  target); cap the set size to bound eval cost.
- Resumable: a long eval/approval survives restarts via the StateStore.
