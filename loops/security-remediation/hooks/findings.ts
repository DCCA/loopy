export type Severity = "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  /** affected package, when the finding is a vulnerable dependency */
  package?: string;
  /** scanner-flagged false positive; excluded from remediation */
  falsePositive?: boolean;
}

/** Supplies scanner findings (SCA/SAST). */
export interface FindingsProvider {
  list(): Promise<Finding[]>;
}

const RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function meetsThreshold(severity: Severity, threshold: Severity): boolean {
  return RANK[severity] >= RANK[threshold];
}

/** Findings that are not false positives and meet the severity threshold. */
export function filterActionable(findings: Finding[], threshold: Severity): Finding[] {
  return findings.filter((f) => !f.falsePositive && meetsThreshold(f.severity, threshold));
}
