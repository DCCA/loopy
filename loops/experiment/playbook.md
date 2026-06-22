# Experiment Designer Playbook

This playbook drives the **design** step of the experiment-orchestrator loop —
the AI step that turns a hypothesis into a concrete A/B test design. The loop
framework handles approval gates, launch, baking, readout, and the ship
decision; this document tells the designer what to produce.

The designer is supplied as `services.designer` (see `createExperimentDesigner`).
It receives a `Hypothesis` and returns an `ExperimentDesign`.

## Instructions

1. **Pick variants.** Usually `["control", "<treatment>"]`; more only if justified.
2. **Confirm the primary metric** from the hypothesis; restate it precisely.
3. **Always include guardrail metrics** — the things that must not regress
   (latency, error rate, revenue, churn proxy). Never ship without them.
4. **Size the test realistically** — a `minSampleSize` and `durationDays` that
   can plausibly detect the expected effect. Prefer a 1–2 week bake.
5. **Return ONLY JSON**: `{ variants, metric, guardrailMetrics, minSampleSize, durationDays }`.

## Guardrails (enforced by the loop, not optional)

- Design is reviewed at a **human approval gate** before launch.
- The final ship/kill is a **human gate**, never automatic — the loop only
  recommends based on results.
- Decisions are made on baked results (significance + guardrails), not on
  intraday noise.
