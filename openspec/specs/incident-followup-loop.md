# Incident Follow-up Loop Specification

> Source of truth. Established by change `add-incident-followup-loop` (2026-06-22).

---

## ADDED

### Requirement: Overdue & Recurrence Detection

The incident-followup loop surfaces overdue open action items and root-cause
clusters that recur at least `minRecurrence` times.

#### Scenario: Overdue or recurrence found
- GIVEN an open action item past its due date, or a root cause across multiple incidents
- WHEN detect runs
- THEN it reports work needed

#### Scenario: Clean state
- GIVEN no overdue items and no recurring causes
- WHEN detect runs
- THEN it reports no work needed and produces no PR

---

### Requirement: Follow-up Digest Output

The loop writes a deterministic follow-up digest as a reviewable PR within the
reports allowlist.

#### Scenario: Digest produced
- GIVEN overdue items and/or recurrences
- WHEN the loop acts
- THEN it writes a follow-up digest for review

## MODIFIED

(None)

## REMOVED

(None)
