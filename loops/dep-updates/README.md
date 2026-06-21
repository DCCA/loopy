# dep-updates loop

Keeps npm dependencies current with **grouped, low-risk** pull requests. Reads
`package.json`, compares each dependency to the registry's latest version, and
opens a single PR bumping the non-major updates. Major updates are detected and
reported but not applied by default — the deliberate antidote to PR fatigue.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | Compare each dep to the registry latest; work needed if any non-major update exists |
| **act** | Bump ranges in `package.json` (preserving `^`/`~`), one grouped change set |
| **output** | One PR; majors listed in the body, not applied |
| **guardrails** | Allowlist `package.json`, `maxFiles: 1`, `skipIfOpenPr` |

Fully deterministic (no AI). The registry is the only external boundary,
injected as `services.registry` (see `createNpmRegistryClient`).

## Configuration (`loop.yaml`)

- `manifestPath` — manifest to update (default `package.json`)
- `includeDev` — also update `devDependencies` (default `true`)
- `allowMajor` — apply major updates too (default `false`)

## Notes

Lockfiles are not regenerated here; consumer CI runs `npm install` after the PR
merges. Automerge-on-green and per-ecosystem support are future enhancements.
