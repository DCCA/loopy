# Data-Contract Guard Playbook

A **breaking-change gate** over a data contract. A schema is a set of named
fields (`{ name, type, required }`). On each pull request the loop diffs the
current schema against the last-approved baseline stored in the durable
`StateStore`. The schema source is the injected boundary.

## Behavior

1. Read the current schema → diff against the stored baseline.
2. Act on the diff:
   - **no baseline** → record the current schema as the baseline (comment);
   - **additive-only** (only new optional fields) → record the new baseline
     automatically (comment);
   - **breaking** (removed field, type change, or a new required field) → post a
     blocking comment listing the breaking changes and require a human **Gate**
     (`data-contract:accept`). The baseline is **not** moved until approved; on
     approval a PR writes the baseline file and persists the new baseline.

## Guardrails

- The baseline is **never silently moved on a breaking change** — acceptance is
  human-gated. Bypassing the gate defeats the loop.
- Diffing is deterministic; "breaking" is everything that is not a new optional
  field.
- Output is a comment except the gated acceptance PR, which is confined to the
  `contracts/**` allowlist.
