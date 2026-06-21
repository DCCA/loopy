# Delta: Security Remediation Loop

**Change ID:** `add-security-remediation-loop`
**Affects:** `loops/security-remediation/`, loop catalog

---

## ADDED

### Requirement: Severity-Driven Finding Detection

The loop ingests scanner findings, filters false positives, and acts only on
findings at or above a configured severity threshold.

#### Scenario: Actionable finding
- GIVEN a scanner finding above the severity threshold that is not a false positive
- WHEN detect runs
- THEN it reports work needed

#### Scenario: No actionable findings
- GIVEN all findings are below threshold or filtered as false positives
- WHEN detect runs
- THEN it reports no work needed and produces no PR

### Requirement: Human-Gated Remediation PR

The loop proposes fixes via a pull request and never merges them automatically.

#### Scenario: Fix proposed for review
- GIVEN an actionable finding with an available fix
- WHEN the loop acts
- THEN it opens a PR with the fix for human review and does not auto-merge

## MODIFIED

(None)

## REMOVED

(None)
