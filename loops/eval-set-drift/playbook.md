# Eval-set Drift Playbook

This loop is **deterministic** — it needs no AI step. It compares the categories
present in the eval/golden dataset against the categories observed in a recent
production sample, and proposes the uncovered production categories as new eval
cases.

## Boundaries

The only external boundary is `services.source`, a `DriftSource` with two
methods:

- `evalCategories()` — the categories represented in the eval/golden set.
- `productionCategories()` — the categories seen in a recent production sample.

Both are injected so the loop stays pure and testable. Everything else
(normalization, set difference, dedup) is computed in-process.

## Behavior

1. **detect** — compute `u = uncovered(evalCategories, productionCategories)`:
   normalize both sides (lowercase, trim, collapse whitespace) and take the
   de-duplicated, sorted production categories absent from the eval set. Load the
   already-surfaced list from state; `fresh` is `u` minus the surfaced set. Work
   is needed only when `fresh.length > 0`.
2. **act** — recompute `u` and `fresh`, **save** `surfaced ∪ fresh` back to the
   `StateStore`, and write a report of the `fresh` categories (the proposed new
   eval cases) to `reportPath`.
3. **output** — one report PR under `reports/`.

## State (dedup of surfaced categories)

State key `eval-set-drift:surfaced` holds a `string[]` of categories already
surfaced. Without it, every weekly run would re-open a PR for the same standing
gap. The loop reports each category once: it reports `fresh`, then unions
`fresh` into the stored list. A category that was once surfaced is never
re-reported, even if it remains uncovered.

## Anti-pattern: PII

Production inputs commonly contain PII. This loop operates strictly at the
**category** level and writes only category labels — never raw production rows —
into the report. Both the report and the PR summary carry the reminder:
_"Add the uncovered cases to your eval set (review for PII)."_ Do not extend the
loop to copy production payloads into the repository.
