import type { FileChange } from "../../../src/core/index.js";
import type { CoverageGap } from "./coverage.js";

/**
 * The AI step (driven by `playbook.md`): generate test file changes that cover
 * the given gaps. Returns an empty array if it cannot produce useful tests.
 */
export type TestGenerator = (gaps: CoverageGap[]) => Promise<FileChange[]>;

export interface ValidationResult {
  /** the suite passes with the generated tests applied */
  passed: boolean;
  /** coverage increased relative to before */
  coverageRose: boolean;
}

/**
 * Runs the project's test suite with the candidate changes applied and reports
 * whether they pass and raise coverage. Injected so the loop self-validates
 * without assuming a specific test runner.
 */
export type Validator = (changes: FileChange[]) => Promise<ValidationResult>;
