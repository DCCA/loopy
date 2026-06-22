# kb-gap loop

Closes documentation gaps that surface as **recurring support tickets**. Reads
resolved tickets, clusters them by topic, drops topics the knowledge base
already covers, and asks an injected AI writer to draft KB articles for what is
left — delivered as a single reviewable pull request.

## How it works

| Phase | What happens |
|-------|--------------|
| **trigger** | Weekly schedule or manual dispatch |
| **detect** | Group resolved tickets by topic; a topic with `>= minTickets` tickets and no existing coverage is a gap; work needed if any gap exists |
| **act** | Pass the gaps to the AI article-writer; map returned articles to a change set under the KB directory |
| **output** | One PR drafting the missing KB articles; writer returns `[]` ⇒ no work |
| **guardrails** | Allowlist `docs/**`, `maxFiles: 20`, `skipIfOpenPr` |

Detection is fully deterministic; the only AI boundary is the article-writer,
driven by `playbook.md`.

## Injected boundaries (`services`)

- `tickets` — a `TicketSource` whose `listResolved()` returns the resolved
  support tickets to mine
- `coveredTopics` — `() => Promise<string[]>` listing topics the KB already
  documents (compared case-insensitively, so gaps exclude existing coverage)
- `articleWriter` — `(gaps) => Promise<DocChange[]>`, the AI step that drafts
  article contents; returns `[]` when it cannot write accurately

## Configuration (`loop.yaml`)

- `kbDir` — directory KB articles are written into (default `docs/kb`)
- `minTickets` — recurring tickets required before a topic counts as a gap
  (default `3`)

## Notes

The loop never publishes a speculative article: an empty writer result is
treated as no work, and every change is gated by the `docs/**` allowlist.
