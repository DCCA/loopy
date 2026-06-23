# Accessibility Baseline Playbook

This loop is **deterministic** — it needs no AI step. It scans for accessibility
violations, diffs them against a recorded baseline, and opens a single report PR
when (and only when) a PR introduces *new* violations.

## Behavior

1. **detect** — run the injected scanner and read the injected baseline, then
   compute `newViolations` (current violations whose `` `${id}@${selector}` ``
   key is not in the baseline). Work is needed only if at least one new
   violation exists.
2. **act** — render a markdown report covering the new violations and any
   resolved baseline debt (`fixedViolations`), and emit a single change writing
   it to `reportPath`.
3. **output** — one PR containing the report; no new violations ⇒ no work.

## Boundaries

- `services.scanner` — the axe-core-style scan; returns the current violations.
  Kept out of the loop so it can be faked deterministically in tests and so no
  browser/DOM is required in core.
- `services.readBaseline` — the accepted-debt baseline. The baseline is the
  contract the gate enforces against.
- `services.now` — the clock, injected for reproducible report dates.

## Guardrails

- Allowlist is `reports/**` only; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate report PRs.

## The "baseline as dumping ground" anti-pattern

The whole value of a baseline gate is the **ratchet**: existing debt is grandfathered
in, but no PR may add to it. That only holds if the baseline shrinks (or holds)
over time. The failure mode is treating the baseline as a place to silence
failures — appending each new violation to it the moment the gate goes red. Do
not automate growing the baseline. Accepting new debt should be a deliberate,
reviewed change, separate from the scan that surfaced it.

## Optional AI enhancement

An AI step could be layered on later to suggest remediations for each new
violation or to triage severity, but it is intentionally not part of the core
deterministic loop.
