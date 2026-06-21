import { describe, expect, it } from "vitest";
import { matchGlob } from "../../src/core/index.js";

describe("matchGlob", () => {
  it("matches a literal path", () => {
    expect(matchGlob("README.md", "README.md")).toBe(true);
    expect(matchGlob("README.md", "docs/README.md")).toBe(false);
  });

  it("treats * as a single segment", () => {
    expect(matchGlob("*.md", "README.md")).toBe(true);
    expect(matchGlob("*.md", "docs/x.md")).toBe(false);
  });

  it("treats ** as crossing separators, including zero segments", () => {
    expect(matchGlob("docs/**", "docs/a/b.md")).toBe(true);
    expect(matchGlob("docs/**", "docs/x.md")).toBe(true);
    expect(matchGlob("**/*.md", "README.md")).toBe(true);
    expect(matchGlob("**/*.md", "docs/guide/intro.md")).toBe(true);
    expect(matchGlob("src/**/*.ts", "src/core/runner.ts")).toBe(true);
    expect(matchGlob("src/**/*.ts", "src/index.ts")).toBe(true);
    expect(matchGlob("src/**/*.ts", "lib/index.ts")).toBe(false);
  });

  it("does not let * escape into other extensions", () => {
    expect(matchGlob("docs/**", "src/x.ts")).toBe(false);
  });
});
