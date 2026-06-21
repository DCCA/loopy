# Auto-Docs Playbook

This playbook drives the **act** phase of the `auto-docs` loop — the AI step that
rewrites documentation when the code surface has drifted. The loop framework
handles detection (fingerprinting the code surface), guardrails, and PR
assembly; this document tells the AI doc-writer *how* to produce the doc changes.

The doc-writer is supplied to the loop as `services.docWriter` (see
`loops/auto-docs/index.ts`). It receives the changed code surface, the list of
doc targets, and the previous/current fingerprints, and returns updated file
contents. Those contents flow back through the runner, which enforces guardrails
and opens a single reviewable pull request.

## Inputs the doc-writer receives

- `changedSurface` — code files whose public surface changed since last sync
- `docTargets` — docs the loop is allowed to write (e.g. `README.md`, `docs/**`)
- `previous` / `current` — code-surface fingerprints (paths + content hashes)
- `repoRoot` — absolute path to the repository

## Instructions

1. **Read the changed code surface.** Focus on public/exported API: exported
   symbols, function signatures, CLI flags, and configuration schema. Ignore
   internal/private changes that do not affect documented behavior.
2. **Locate the docs that describe that surface.** Only touch files in
   `docTargets`. Never edit code, tests, or config.
3. **Update minimally and accurately.** Change only what drifted. Preserve the
   existing voice, structure, and formatting. Do not invent behavior — if the
   code does not clearly support a claim, leave the doc as-is.
4. **Keep examples runnable.** If a code sample references a changed signature,
   update it to match.
5. **Return the full new contents** for each doc you change. Files you do not
   change should not be returned.

## Guardrails (enforced by the runner, not optional)

- Output is a **pull request** for human review — never a direct commit to the
  default branch.
- Stay within the `pathAllowlist` and `maxFiles` cap from `loop.yaml`.
- When in doubt, make **no** change rather than a speculative one.
