import type { PullRequestDiff } from "./diff.js";

export type ReviewSeverity = "info" | "warning" | "error";

export interface ReviewIssue {
  severity: ReviewSeverity;
  message: string;
  file?: string;
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
}

/**
 * The AI step (driven by `playbook.md`): review a diff and return a summary plus
 * any flagged issues. This is the loop's only provider-specific boundary.
 */
export type Reviewer = (diff: PullRequestDiff) => Promise<ReviewResult>;

const SEVERITY_ICON: Record<ReviewSeverity, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "❌",
};

/** Render a review result as an advisory PR comment (markdown). */
export function renderReview(result: ReviewResult): string {
  const lines: string[] = ["## 🤖 loopy automated review", "", result.summary.trim(), ""];

  if (result.issues.length === 0) {
    lines.push("No issues flagged.");
  } else {
    lines.push(`Flagged ${result.issues.length} item(s):`, "");
    for (const issue of result.issues) {
      const where = issue.file ? ` \`${issue.file}\`` : "";
      lines.push(`- ${SEVERITY_ICON[issue.severity]}${where} ${issue.message}`);
    }
  }

  lines.push("", "_Advisory only — this comment is not a merge gate._");
  return lines.join("\n");
}
