# Release Train Playbook

This loop is **deterministic** — it needs no AI step. From the unreleased
conventional commits it computes the next semver bump and opens a single Release
PR that bumps `package.json` and prepends a `CHANGELOG.md` entry. Merging the PR
cuts the release.

## Behavior

1. **detect** — read `source.unreleased()`. If the commits yield no bump
   (empty set), no work is needed; otherwise report the target version and bump
   level (e.g. "release 1.3.0 (minor)").
2. **act** — read `source.currentVersion()`, compute `next`, set the manifest
   `version`, and prepend the grouped release notes to the changelog. Emit a
   two-file change set (manifest + changelog). If the commit set is empty by the
   time `act` runs, return a no-op change set.
3. **output** — one Release PR; the body is the release notes plus a footer.

## Semver bump rules

- breaking commit ⇒ **major**
- any `feat` ⇒ **minor**
- otherwise ⇒ **patch**
- no commits ⇒ no release

Versions parse as `x.y.z` (a leading `v` is tolerated) and are re-emitted
without the `v`.

## Guardrails

- Allowlist is `package.json` + `CHANGELOG.md`; `maxFiles: 2`.
- `skipIfOpenPr` avoids stacking duplicate Release PRs.
- The change set is never written to disk by the loop; it is proposed for the PR.

## Boundaries

The commit source and current version are injected via `services.source`
(`unreleased()` / `currentVersion()`). The release date can be overridden with
`services.now` for reproducible tests.

## Optional AI enhancement

An AI step could later summarize highlights or draft human-readable release
notes, but it is intentionally not part of the core deterministic loop.
