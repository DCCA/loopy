# Prompt-Eval Gate Playbook

A promptfoo-style **regression gate** over a prompt eval set. Runs each case
through the model, grades deterministically, and compares the scorecard to a
baseline stored in the durable `StateStore`. The model and the eval set are
injected boundaries.

## Behavior

1. Run every case → output → deterministic grade (output contains `expect`).
2. Compare the scorecard to the stored baseline:
   - **no baseline** → establish it (comment);
   - **regressions** (a case that passed in baseline now fails) → blocking
     advisory comment; the baseline is **not** moved;
   - **improvement** → a human **Gate** must approve promotion; until then a
     comment notes it; on approval, a PR writes the baseline file and the new
     baseline is persisted.

## Guardrails

- The baseline is **never silently moved** — promotion is human-gated.
- Grading is deterministic; prefer crisp `expect` assertions over fuzzy rubrics
  to avoid flaky LLM-graded thresholds.
- Output is advisory (a comment) except the gated baseline-promotion PR, which is
  confined to the `evals/**` allowlist.
