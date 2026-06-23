# i18n Drift Playbook

This loop is **deterministic** — it needs no AI step. It compares each locale's
translation keys against the default locale and writes a status report that
surfaces drift before it ships.

## Behavior

1. **detect** — load the default locale's key set and every other locale's keys
   from the injected `LocaleSource`, then compute drift. Work is needed only if
   at least one locale has a missing or orphaned key.
2. **act** — render a single markdown report (per-locale missing/orphaned key
   lists) and emit it as one change set written to `reportPath`.
3. **output** — one PR carrying the status report.

## Missing vs orphaned

- **Missing** — a key present in the default locale but absent from a target
  locale. These need translating.
- **Orphaned** — a key present in a target locale but no longer defined by the
  default locale. These are dead and should be removed.

## Guardrails

- Allowlist is `reports/**`; `maxFiles: 5`.
- `skipIfOpenPr` avoids stacking duplicate status PRs.

## Optional AI enhancement

An AI step could later draft candidate translations for the missing keys, but it
is intentionally not part of the core deterministic loop.
