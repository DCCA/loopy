# auto-docs loop

Keeps repository documentation in sync with the code. When the public **code
surface** drifts from the last synced state, the loop opens a single, reviewable
pull request that updates the docs.

It is loopy's first loop and the reference implementation of the loop contract:
`trigger → detect → act → output → guardrails`.

## How it works

| Phase | What happens | Where |
|-------|--------------|-------|
| **trigger** | Schedule (weekly) or manual dispatch | `loop.yaml`, workflow |
| **detect** | Fingerprint the code surface (`codeSurface` globs) and compare to the stored marker. No drift → no work. | `hooks/fingerprint.ts`, `hooks/surface.ts` |
| **act** | An AI doc-writer (`services.docWriter`, driven by `playbook.md`) rewrites the affected docs; the marker is updated. | `index.ts`, `playbook.md` |
| **output** | The runner enforces guardrails and the GitHub adapter opens a PR. | `src/core/runner.ts`, `src/adapters/github-action` |
| **guardrails** | `pathAllowlist`, `maxFiles`, `skipIfOpenPr` | `loop.yaml` |

The only provider-specific part is `docWriter` (the AI step). Everything else —
drift detection, idempotency, guardrails, PR assembly — is deterministic and
unit-tested.

## Configuration (`loop.yaml`)

- `codeSurface` — globs for the code whose changes should trigger doc updates
- `docTargets` — docs the loop may write
- `markerPath` — file storing the last-synced fingerprint (must be allowlisted)
- `guardrails.pathAllowlist` / `maxFiles` / `skipIfOpenPr`

## Usage

See `example.github-workflow.yml` for a consumer workflow. Programmatically:

```ts
import { githubAction } from "loopy";
import { createGitHubRestClient } from "loopy"; // re-exported via githubAction too

const result = await githubAction.runAutoDocsAction({
  repoRoot: process.cwd(),
  manifestPath: "node_modules/loopy/loops/auto-docs/loop.yaml",
  client: githubAction.createGitHubRestClient({
    owner: "my-org",
    repo: "my-repo",
    token: process.env.GITHUB_TOKEN!,
  }),
  services: { docWriter: myAiDocWriter }, // implements DocWriter
});
```
