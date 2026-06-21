# PR Review Playbook

This playbook drives the **act** phase of the `pr-review` loop — the AI step that
reviews a pull request diff. The loop framework handles the event trigger and
posts the result as a **comment** (the comment output channel); this document
tells the AI reviewer what to produce.

The reviewer is supplied as `services.reviewer` (see `index.ts`). It receives the
diff and returns a `ReviewResult` (`summary` + `issues[]`), which is rendered to
an advisory comment.

## Instructions

1. **Summarize the change** in 1–3 sentences: what it does and why.
2. **Flag concrete issues** only — correctness bugs, missing tests for risky
   changes, security/footgun patterns, or violations of stated conventions.
   Each issue has a severity (`info` / `warning` / `error`), a message, and
   optionally a file.
3. **Be specific and brief.** Prefer a few high-signal notes over many nitpicks.
4. **Do not approve, request changes, merge, or close.** This loop is advisory.

## Guardrails

- Output is a single comment — never a code change, approval, or merge.
- The comment is clearly labeled as automated and "not a merge gate".
- An empty review (no summary, no issues) yields no comment.
