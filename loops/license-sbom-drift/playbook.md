# License SBOM Drift Playbook

This loop is **deterministic** — it needs no AI step. It reads the software bill
of materials (SBOM: each dependency mapped to its license), classifies every
license against an allowlist, and opens a single PR with a license report when
any dependency falls outside the allowlist.

## Behavior

1. **detect** — read the SBOM (`services.sbom.current()`), classify each entry,
   and collect the violations (denied + unknown licenses). Work is needed only if
   at least one violation exists.
2. **act** — render a license report (a full table plus a flagged `⚠ Review`
   section) and emit a single change writing it to `reportPath`.
3. **output** — one PR containing the report; no violations ⇒ no work.

## Classification

Each license id is normalized (trimmed, uppercased) before comparison:

- `"unknown"` — license is empty, `UNKNOWN`, or `UNLICENSED`.
- `"allowed"` — normalized license is on the (normalized) allowlist.
- `"denied"` — anything else (a real but non-allowlisted license).

`unknown` and `denied` are both **violations**, sorted by package name. The
classification is case-insensitive (`mit` matches `MIT`), so SBOM casing quirks
never produce false positives or negatives.

## The SBOM boundary

The SBOM is an injected boundary (`services.sbom`, a `SbomSource`). The loop does
no network or filesystem discovery itself — wiring a real SBOM generator (e.g. a
`license-checker` or CycloneDX export) is the caller's job. The clock is injected
as `services.now` for reproducible report dates.

## Guardrails

- Allowlist is `reports/**`; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate report PRs.

## Human-in-the-loop

This loop **flags**; it does not decide. A human reviews the report and either
grants an exception (add the license to the allowlist) or replaces the offending
dependency. The loop deliberately stops at a report — it never edits manifests or
removes dependencies on its own.

## Future work

Persisting per-package exceptions (an approved-violations ledger) and diffing
against the previous report to surface only *new* drift are natural enhancements,
intentionally left out of the core deterministic loop.
