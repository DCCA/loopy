# KB-Gap Self-Heal Playbook

This playbook drives the **act** phase of the `kb-gap` loop — the AI step that
drafts knowledge-base articles for topics that recur in support tickets but are
missing from the docs. The loop framework handles detection (grouping resolved
tickets and excluding already-covered topics), guardrails, and PR assembly;
this document tells the AI article-writer *how* to produce the article changes.

The article-writer is supplied to the loop as `services.articleWriter` (see
`loops/kb-gap/index.ts`). It receives the detected gaps and returns the contents
of any KB articles to write. Those contents flow back through the runner, which
enforces guardrails and opens a single reviewable pull request.

## Inputs the article-writer receives

Each gap is a `{ topic, count, tickets }` object:

- `topic` — the normalized recurring topic (the gap)
- `count` — how many resolved tickets clustered on this topic
- `tickets` — the underlying resolved tickets, each with a `question` and
  (usually) a `resolution`

## Instructions

1. **Read the resolved tickets for each gap.** The `resolution` fields are the
   source of truth for what actually fixed the customer's problem. Base the
   article on those resolutions, not on guesswork.
2. **Write one article per gap.** Use clear KB structure: a title, the symptom
   or question, and the resolution steps. Keep the voice consistent with the
   existing knowledge base.
3. **Write only under the KB directory** (`kbDir`, default `docs/kb`). Never edit
   code, tests, or config. Choose a stable, slug-like filename per topic.
4. **Do not invent facts.** If the resolutions are inconsistent, ambiguous, or
   too thin to document accurately, **return `[]` for that gap** rather than
   publishing a speculative article.
5. **Return the full contents** for each article you write. Topics you skip
   should not appear in the output.

## Guardrails (enforced by the runner, not optional)

- Output is a **pull request** for human review — never a direct commit to the
  default branch.
- Stay within the `pathAllowlist` and `maxFiles` cap from `loop.yaml`.
- When in doubt, make **no** change rather than a speculative one. Returning an
  empty list is treated as no work.
