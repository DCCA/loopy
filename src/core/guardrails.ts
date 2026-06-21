import type { FileChange, Guardrails } from "./types.js";

/** Thrown when a change set violates a loop's guardrails. */
export class GuardrailViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailViolation";
  }
}

/**
 * Minimal glob matcher supporting `**` (across path separators), `*` (within a
 * single segment), and `?` (single non-separator character). Paths use `/`.
 */
export function matchGlob(pattern: string, path: string): boolean {
  return globToRegExp(pattern).test(path);
}

function globToRegExp(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern.charAt(i);
    if (c === "*") {
      if (pattern.charAt(i + 1) === "*") {
        // "**" matches across path separators
        re += ".*";
        i++;
        // swallow a trailing slash so "**/x" also matches "x"
        if (pattern.charAt(i + 1) === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^${}()|[]\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/**
 * Enforce a loop's guardrails over a proposed change set. Throws
 * {@link GuardrailViolation} if any rule is broken; the runner treats that as a
 * fail-safe (no output).
 */
export function enforceGuardrails(changes: FileChange[], guardrails: Guardrails): void {
  const { pathAllowlist, maxFiles } = guardrails;

  if (typeof maxFiles === "number" && changes.length > maxFiles) {
    throw new GuardrailViolation(
      `change set of ${changes.length} file(s) exceeds maxFiles=${maxFiles}`,
    );
  }

  if (pathAllowlist && pathAllowlist.length > 0) {
    for (const change of changes) {
      const allowed = pathAllowlist.some((p) => matchGlob(p, change.path));
      if (!allowed) {
        throw new GuardrailViolation(`path "${change.path}" is not in the allowlist`);
      }
    }
  }
}
