# prompt-eval-gate loop

A regression gate over a **prompt eval set**: run cases through the model, grade
them, and compare to a baseline in the durable `StateStore`. Flags regressions on
the PR and **human-gates** baseline promotions. loopy dogfoods this on its own
AI loops' prompts.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | `pull_request` event (e.g. a prompt file changed) |
| **detect** | Run the eval set; compare scorecard to the stored baseline |
| **act** | no baseline → establish it · regressions → blocking comment · improvement → gated promotion |
| **output** | A comment (scorecard); a PR writing `evals/baseline.json` only on approved promotion |
| **guardrails** | Baseline never moves without the Gate; PR confined to `evals/**` |

## Boundaries (injected, testable)

- `services.model(input)` — the model (reuses loopy's OpenRouter AI client)
- `services.evals.cases()` — the eval set (`{ id, input, expect }`)
- `services.state` — the durable baseline + the promotion gate

## Notes

Grading is deterministic (output contains `expect`) to avoid flaky LLM-judged
thresholds. Regressions are advisory (a comment), never an auto-merge block; the
baseline is only promoted through the human gate.
