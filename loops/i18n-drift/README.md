# i18n-drift loop

Detects **translation-key drift** and reports it in a single, low-noise pull
request. It compares every locale against the default locale, finds keys that
are missing (need translating) or orphaned (no longer used), and writes a status
report — the deliberate antidote to silently shipping untranslated UI.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | A `pull_request` event |
| **detect** | Compare each locale to the default key set; work needed if any locale has missing or orphaned keys |
| **act** | Render a per-locale status report, one change set |
| **output** | One PR writing `reports/i18n-status.md` |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The locale data is the only external boundary,
injected as `services.source` (a `LocaleSource`).

## Missing vs orphaned

- **Missing** — defined by the default locale but absent from a target locale.
- **Orphaned** — present in a target locale but no longer defined by the default.

## Configuration (`loop.yaml`)

- `reportPath` — where the status report is written (default
  `reports/i18n-status.md`)

## Notes

The loop only reports drift; it does not author translations. Layering an AI step
to draft candidate translations is a future enhancement.
