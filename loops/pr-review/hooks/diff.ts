export interface DiffFile {
  path: string;
  /** unified-diff patch for the file */
  patch: string;
}

export interface PullRequestDiff {
  files: DiffFile[];
}

/** Supplies the diff of the pull request under review. */
export interface DiffProvider {
  getDiff(): Promise<PullRequestDiff>;
}
