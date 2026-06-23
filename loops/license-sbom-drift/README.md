# license-sbom-drift loop

Guards the **dependency license posture**. Reads the SBOM (each dependency mapped
to its license), classifies every license against an allowlist, and writes a
license report as a single reviewable pull request when any dependency drifts off
the allowlist — a license auditor, not a gatekeeper.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | Classify each dependency's license; work needed if any denied/unknown license exists |
| **act** | Render a license report (full table + flagged `⚠ Review` section) and write it to `reportPath` |
| **output** | One PR containing the report; no violations ⇒ no work |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The SBOM is the only external boundary, injected as
`services.sbom` (a `SbomSource`); the clock is injected as `services.now` for
reproducible output.

## Classification

Each license id is normalized (trimmed, uppercased) before comparison:

- **unknown** — license is empty, `UNKNOWN`, or `UNLICENSED`.
- **allowed** — normalized license is on the (normalized) allowlist.
- **denied** — a real but non-allowlisted license.

`unknown` and `denied` are both **violations**, sorted by package name. Matching
is case-insensitive, so `mit` and `MIT` are treated the same.

## The allowlist

The default allowlist is a set of permissive OSS licenses safe to use without
review:

`MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `CC0-1.0`,
`Unlicense`.

Override it in `loop.yaml` (`config.allowlist`); a non-empty array replaces the
default. Granting an exception to a flagged license is as simple as adding it
here.

## Injected boundaries (`services`)

- `sbom` — a `SbomSource` whose `current()` returns the dependency→license
  inventory. There is no network in the loop; wiring a real SBOM source is the
  caller's job.
- `now` — `() => Date`, the clock used to date the report (default `new Date`).

## Configuration (`loop.yaml`)

- `reportPath` — path the license report is written to (default
  `reports/licenses.md`)
- `allowlist` — licenses accepted without review (default: the permissive set
  above)

## Human-in-the-loop

This loop flags; it does not decide. A human reviews the report and either grants
an exception (extend the allowlist) or replaces the offending dependency. It
never edits manifests or removes dependencies automatically.

## Future work

Persisting per-package exceptions (an approved-violations ledger) and diffing
against the previous report to surface only *new* drift are natural enhancements,
intentionally left out of the core deterministic loop.
