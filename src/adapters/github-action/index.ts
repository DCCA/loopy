import type { FileChange, Guardrails, RunResult } from "../../core/index.js";

export interface OpenPrQuery {
  /** the loop whose open PRs we are checking for */
  loopId: string;
}

export interface CreatePrInput {
  branch: string;
  baseBranch: string;
  title: string;
  body: string;
  changes: FileChange[];
}

export interface PullRequestRef {
  number: number;
  url: string;
}

export interface PostCommentInput {
  /** the PR/issue number to comment on */
  issueNumber: number;
  body: string;
}

export interface CommentRef {
  url: string;
}

/** The GitHub operations the adapter needs, isolated for testability. */
export interface GitHubClient {
  /** true if an open PR created by this loop already exists */
  hasOpenLoopPr(query: OpenPrQuery): Promise<boolean>;
  createPullRequest(input: CreatePrInput): Promise<PullRequestRef>;
  /** post an advisory comment on a PR/issue */
  postComment(input: PostCommentInput): Promise<CommentRef>;
}

export interface PublishOptions {
  baseBranch?: string;
  branchPrefix?: string;
  guardrails?: Guardrails;
  title?: string;
  /** target PR/issue number for comment-output loops */
  prNumber?: number;
}

export type PublishResult =
  | { status: "skipped"; reason: string }
  | { status: "no-op"; reason: string }
  | { status: "published"; pr: PullRequestRef }
  | { status: "commented"; comment: CommentRef };

/**
 * Publish a produced {@link RunResult}. For pull-request output it opens a PR,
 * honoring the `skipIfOpenPr` guardrail (defaults to on) and never committing to
 * the base branch. For comment output it posts an advisory comment.
 */
export async function publishRunResult(
  result: RunResult,
  client: GitHubClient,
  options: PublishOptions = {},
): Promise<PublishResult> {
  if (result.status !== "produced") {
    return { status: "no-op", reason: `run status was "${result.status}"` };
  }

  if (result.outputKind === "comment") {
    if (!result.comment) {
      return { status: "no-op", reason: "comment output had no body" };
    }
    if (options.prNumber == null) {
      return { status: "no-op", reason: "no PR/issue number provided for comment output" };
    }
    const comment = await client.postComment({
      issueNumber: options.prNumber,
      body: result.comment,
    });
    return { status: "commented", comment };
  }

  if (!result.changes || result.changes.length === 0) {
    return { status: "no-op", reason: "no changes to publish" };
  }

  const skipIfOpenPr = options.guardrails?.skipIfOpenPr ?? true;
  if (skipIfOpenPr && (await client.hasOpenLoopPr({ loopId: result.loopId }))) {
    return { status: "skipped", reason: "an open PR for this loop already exists" };
  }

  const prefix = options.branchPrefix ?? "loopy";
  const branch = `${prefix}/${result.loopId}`;
  const pr = await client.createPullRequest({
    branch,
    baseBranch: options.baseBranch ?? "main",
    title: options.title ?? `chore(${result.loopId}): automated update`,
    body: result.summary ?? "Automated update produced by loopy.",
    changes: result.changes,
  });
  return { status: "published", pr };
}

export { createGitHubRestClient } from "./github-client.js";
export type { GitHubRestOptions } from "./github-client.js";
export { runAutoDocsAction } from "./run.js";
export type { RunAutoDocsOptions, AutoDocsActionResult } from "./run.js";
