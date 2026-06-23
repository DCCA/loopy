# release-train loop

release-please / changesets-style automation. From the **unreleased**
conventional commits it computes the next semver bump and opens a single
**Release PR** that bumps the `package.json` version and prepends a
`CHANGELOG.md` entry. Merging that PR is what cuts the release.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | `push` event (or manual dispatch) |
| **detect** | Read unreleased commits; work needed if they yield a bump |
| **act** | Bump the manifest version + prepend release notes; one change set |
| **output** | One Release PR (version + changelog), newest entry on top |
| **guardrails** | Allowlist `package.json` + `CHANGELOG.md`, `maxFiles: 2`, `skipIfOpenPr` |

Fully deterministic (no AI). The commit source and the current version are the
only external boundaries, injected as `services.source` (a `ReleaseSource`).

## Deterministic semver bump

The bump is derived purely from the conventional-commit types in the
unreleased set:

- a **breaking** commit (`feat!:`, `fix!:`, …) ⇒ **major**
- any **`feat`** ⇒ **minor**
- otherwise (`fix`, `chore`, `docs`, …) ⇒ **patch**
- **no commits** ⇒ no release

`x.y.z` is parsed (a leading `v` is tolerated) and re-emitted without the `v`.

## The Release PR

`act` reads the existing `package.json`, sets `.version` to the next version,
and re-serializes it with two-space indentation and a trailing newline. It reads
the existing `CHANGELOG.md` (or starts an empty one), ensures a `# Changelog`
header, and prepends a `## <version> - <date>` section grouping the commits by
type (Features, Bug Fixes, …). The PR body is those release notes plus a footer
noting that merging cuts the release.

## Boundaries

- **`source.unreleased()`** — the conventional commits since the last release.
- **`source.currentVersion()`** — the current version string.
- **`services.now`** — overrides the release date (used in tests); defaults to
  today.

Tagging, publishing, and lockfile regeneration happen downstream once the
Release PR merges; this loop only proposes the version + changelog change set.

## Configuration (`loop.yaml`)

- `manifestPath` — manifest whose version is bumped (default `package.json`)
- `changelogPath` — changelog to prepend to (default `CHANGELOG.md`)
