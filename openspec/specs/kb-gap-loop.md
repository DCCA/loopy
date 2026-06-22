# KB-Gap Self-Heal Loop Specification

> Source of truth. Established by change `add-kb-gap-loop` (2026-06-22).

## Requirements

### Requirement: Documentation Gap Detection

The kb-gap loop groups recurring resolved tickets by topic and identifies topics
with enough volume that are not covered by the knowledge base.

#### Scenario: Gap found
- GIVEN resolved tickets where a topic recurs at least `minTickets` times and is not covered by the KB
- WHEN the loop's detect phase runs
- THEN it reports work needed and identifies the topic

#### Scenario: No gap
- GIVEN every recurring topic is already covered by the KB
- WHEN detect runs
- THEN it reports no work needed and produces no PR

---

### Requirement: AI-Drafted KB Articles via PR

The loop drafts KB articles for the gaps and opens a single reviewable pull
request within the docs allowlist; it never publishes without review.

#### Scenario: Articles drafted
- GIVEN one or more detected gaps
- WHEN the loop acts
- THEN it produces a change set of KB markdown files for human review

#### Scenario: Writer declines
- GIVEN the article writer returns no articles
- WHEN the loop acts
- THEN no PR is produced (fail-safe)
