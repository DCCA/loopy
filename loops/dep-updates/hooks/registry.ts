/** Resolves the latest published version of a package. */
export interface RegistryClient {
  getLatest(pkg: string): Promise<string | null>;
}

export interface NpmRegistryOptions {
  apiBase?: string;
  fetchImpl?: typeof fetch;
}

/** A real npm registry client (injectable fetch for testing). */
export function createNpmRegistryClient(opts: NpmRegistryOptions = {}): RegistryClient {
  const apiBase = opts.apiBase ?? "https://registry.npmjs.org";
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    async getLatest(pkg: string): Promise<string | null> {
      const res = await doFetch(`${apiBase}/${encodeURIComponent(pkg)}/latest`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { version?: string };
      return typeof data.version === "string" ? data.version : null;
    },
  };
}
