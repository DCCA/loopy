# Delta: License/SBOM Drift Loop

**Change ID:** `add-license-sbom-loop`
**Affects:** `loops/license-sbom-drift/`, CLI catalog/run

---

## ADDED

### Requirement: License Classification

The license-sbom-drift loop classifies each dependency's license against an
allowlist as allowed, denied, or unknown.

#### Scenario: Violation detected
- GIVEN a dependency whose license is not on the allowlist (or is unknown)
- WHEN detect runs
- THEN it reports work needed and identifies the dependency

#### Scenario: All allowed
- GIVEN every dependency license is on the allowlist
- WHEN detect runs
- THEN no PR is produced

---

### Requirement: License Report Output

The loop writes a license report PR flagging the violations for review.

#### Scenario: Report produced
- GIVEN one or more license violations
- WHEN the loop acts
- THEN it writes a license report listing the posture and flagging the violations

## MODIFIED

(None)

## REMOVED

(None)
