# a11y-baseline loop

An accessibility **regression gate** (axe-core style). It scans for violations,
diffs them against a recorded **baseline** of already-known violations (accepted
debt), and fails only on the **new** ones — so a backlog of pre-existing issues
never blocks every PR, but no PR is allowed to make things worse. When new
violations appear it writes a report as a single reviewable pull request.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | A `pull_request` event |
| **detect** | Scan, diff against the baseline; work needed if any violation is new |
| **act** | Render a report (new violations + resolved baseline debt) to `reportPath` |
| **output** | One PR containing the report; no new violations ⇒ no work |
| **guardrails** | Allowlist `reports/**`, `maxFiles: 5`, `skipIfOpenPr` |

Fully deterministic (no AI). The scan and the baseline are the only external
boundaries, injected as `services.scanner` (an `A11yScanner`) and
`services.readBaseline`; the clock is injected as `services.now` for
reproducible output.

## New-vs-baseline rule

Each violation has a stable key, `` `${id}@${selector}` `` (`violationKey`).

- **New** = a current violation whose key is not in the baseline. These block.
- **Resolved** = a baseline violation whose key is no longer in the current
  scan. The report notes these so the baseline can be trimmed.

The baseline is the contract: it is what you have explicitly chosen to live with
for now. Comparing by key (not by count) means moving a violation to a new
selector reads as both a fix and a regression — intentional, because it is.

## Injected boundaries (`services`)

- `scanner` — an `A11yScanner` whose `scan()` returns the current violations.
  There is no browser or DOM in the loop; running a real scanner is the caller's
  job.
- `readBaseline` — `() => Promise<Violation[]>`, the accepted-debt baseline.
- `now` — `() => Date`, the clock used to date the report (default `new Date`).

## Configuration (`loop.yaml`)

- `reportPath` — path the report is written to (default `reports/a11y.md`)

## Anti-pattern warning

The baseline is **not a dumping ground**. The point of the gate is to ratchet
debt *down* over time; if every new violation is quietly appended to the
baseline, the gate becomes decorative and accessibility silently rots. Growing
the baseline (accepting more debt) must be a deliberate, reviewed change — never
an automatic side effect of a failing scan.
