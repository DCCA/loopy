# experiment-orchestrator loop

A **long-horizon, multi-step** loop that drives an experiment from hypothesis to
decision — the flagship example of loopy's `longrun` primitives (durable state,
human-approval gates, resumable plans).

It is **not** a single-shot `Loop`; it advances a resumable **plan** via
`runPlan`. Call `advanceExperiment(...)` repeatedly (e.g. on a schedule); each
call resumes from the last pause and is a no-op once the plan completes.

## The plan

```
design → approve-design (gate) → launch → bake (wait) → readout → decide (gate)
```

| Step | What happens | Pause? |
|------|--------------|--------|
| **design** | AI designer turns the hypothesis into an `ExperimentDesign` (variants, metric, guardrails, sample size, duration) | — |
| **approve-design** | Human approval gate before spend | **blocked** until decided |
| **launch** | Create the experiment on the platform; record launch time | — |
| **bake** | Wait until results are available (long-horizon) | **waiting** until results land |
| **readout** | Render a readout from results | — |
| **decide** | Ship/kill/iterate — human gate; respects the recommendation | **blocked** until decided |

A rejected design short-circuits the plan to `finalDecision: "rejected"` without
launching.

## Boundaries (injected, testable)

- `services.designer` — the AI design step (`createExperimentDesigner` over the
  OpenRouter provider).
- `services.platform` — the experimentation platform (`launch` + `results`);
  adapt to Statsig/Eppo/GrowthBook/LaunchDarkly.
- A `StateStore` (memory or file) carries plan progress + experiment registry
  across runs; gates are created from it.

## Usage

```ts
import { advanceExperiment } from "loopy/loops/experiment";
import { createFileStateStore } from "loopy";

const store = createFileStateStore(".loopy/state");
const result = await advanceExperiment("exp-cta", hypothesis, { designer, platform }, store);
// result.status: "blocked" | "waiting" | "completed"; result.memory carries
// design, experimentKey, results, readout, finalDecision as they are produced.
```

## Status

Programmatic for now. A CLI verb to advance plans on a schedule
(`loopy advance <plan>`) is a planned follow-up; it needs a persistent state
location and a hypothesis registry.
