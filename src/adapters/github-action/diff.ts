export interface GitHubDiffOptions {
  owner: string;
  repo: string;
  token: string;
  prNumber: number;
  apiBase?: string;
  fetchImpl?: typeof fetch;
}

export interface DiffFile {
  path: string;
  patch: string;
}

export interface PullRequestDiff {
  files: DiffFile[];
}

interface PrFile {
  filename: string;
  patch?: string;
}

/**
 * A GitHub-backed PR diff provider: lists the pull request's changed files with
 * their patches (`GET /repos/{owner}/{repo}/pulls/{n}/files`). Returns up to the
 * first 100 files; pagination is a follow-up.
 */
export function createGitHubDiffProvider(opts: GitHubDiffOptions): { getDiff(): Promise<PullRequestDiff> } {
  const apiBase = opts.apiBase ?? "https://api.github.com";
  const doFetch = opts.fetchImpl ?? fetch;

  return {
    async getDiff(): Promise<PullRequestDiff> {
      const res = await doFetch(
        `${apiBase}/repos/${opts.owner}/${opts.repo}/pulls/${opts.prNumber}/files?per_page=100`,
        {
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${opts.token}`,
            "x-github-api-version": "2022-11-28",
          },
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API list-files failed: ${res.status} ${text}`);
      }
      const files = (await res.json()) as PrFile[];
      return { files: files.map((f) => ({ path: f.filename, patch: f.patch ?? "" })) };
    },
  };
}
