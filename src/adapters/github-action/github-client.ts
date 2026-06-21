import type { CreatePrInput, GitHubClient, OpenPrQuery, PullRequestRef } from "./index.js";

export interface GitHubRestOptions {
  owner: string;
  repo: string;
  token: string;
  /** branch-name prefix used to identify this tool's PRs (default "loopy") */
  branchPrefix?: string;
  /** API base, overridable for GitHub Enterprise (default api.github.com) */
  apiBase?: string;
  /** injectable fetch, primarily for testing */
  fetchImpl?: typeof fetch;
}

type TreeItem = {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string | null;
};

/**
 * A real GitHub REST client built on the git-data API: it creates blobs, a
 * tree, a commit, a branch ref, and finally a pull request. Network calls go
 * through an injectable `fetch` so the flow is unit-testable.
 */
export function createGitHubRestClient(opts: GitHubRestOptions): GitHubClient {
  const apiBase = opts.apiBase ?? "https://api.github.com";
  const prefix = opts.branchPrefix ?? "loopy";
  const doFetch = opts.fetchImpl ?? fetch;
  const base = `/repos/${opts.owner}/${opts.repo}`;

  async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${apiBase}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${opts.token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API ${method} ${path} failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }

  return {
    async hasOpenLoopPr(query: OpenPrQuery): Promise<boolean> {
      const head = `${opts.owner}:${prefix}/${query.loopId}`;
      const prs = await api<unknown[]>(
        "GET",
        `${base}/pulls?state=open&head=${encodeURIComponent(head)}`,
      );
      return prs.length > 0;
    },

    async createPullRequest(input: CreatePrInput): Promise<PullRequestRef> {
      const ref = await api<{ object: { sha: string } }>(
        "GET",
        `${base}/git/ref/heads/${input.baseBranch}`,
      );
      const baseSha = ref.object.sha;
      const baseCommit = await api<{ tree: { sha: string } }>(
        "GET",
        `${base}/git/commits/${baseSha}`,
      );

      const tree: TreeItem[] = [];
      for (const change of input.changes) {
        if (change.op === "delete") {
          tree.push({ path: change.path, mode: "100644", type: "blob", sha: null });
          continue;
        }
        const blob = await api<{ sha: string }>("POST", `${base}/git/blobs`, {
          content: Buffer.from(change.contents, "utf8").toString("base64"),
          encoding: "base64",
        });
        tree.push({ path: change.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      const newTree = await api<{ sha: string }>("POST", `${base}/git/trees`, {
        base_tree: baseCommit.tree.sha,
        tree,
      });
      const commit = await api<{ sha: string }>("POST", `${base}/git/commits`, {
        message: input.title,
        tree: newTree.sha,
        parents: [baseSha],
      });
      await api("POST", `${base}/git/refs`, {
        ref: `refs/heads/${input.branch}`,
        sha: commit.sha,
      });

      const pr = await api<{ number: number; html_url: string }>("POST", `${base}/pulls`, {
        title: input.title,
        head: input.branch,
        base: input.baseBranch,
        body: input.body,
      });
      return { number: pr.number, url: pr.html_url };
    },
  };
}
