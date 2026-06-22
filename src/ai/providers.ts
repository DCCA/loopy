import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FileChange } from "../core/index.js";
import type { AiClient } from "./client.js";
import { parseJsonResponse } from "./json.js";
import { resolveFiles } from "../../loops/auto-docs/hooks/surface.js";
import type { DocChange, DocWriter, DocWriterInput } from "../../loops/auto-docs/index.js";
import type { Reviewer, ReviewResult } from "../../loops/pr-review/index.js";
import type { CoverageGap } from "../../loops/test-coverage/index.js";
import type { TestGenerator } from "../../loops/test-coverage/index.js";
import type { ArticleWriter, KbGap } from "../../loops/kb-gap/index.js";

/** AI-backed doc writer for the auto-docs loop. */
export function createDocWriter(client: AiClient): DocWriter {
  return async (input: DocWriterInput): Promise<DocChange[]> => {
    const docFiles = await safeResolve(input.repoRoot, input.docTargets);
    const docs = await readMany(input.repoRoot, docFiles);
    const surface = await readMany(input.repoRoot, input.changedSurface);

    const system =
      "You keep documentation in sync with code. Update only the provided docs to " +
      "reflect the changed code surface. Do not invent behavior. Respond ONLY with " +
      'JSON: an array of objects {"path","contents"} for docs you change (full new ' +
      "contents). Return [] if nothing should change.";
    const user = JSON.stringify({ changedCode: surface, currentDocs: docs });

    const text = await client.complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return parseJsonResponse<DocChange[]>(text);
  };
}

/** AI-backed reviewer for the pr-review loop. */
export function createReviewer(client: AiClient): Reviewer {
  return async (diff): Promise<ReviewResult> => {
    const system =
      "You are an advisory code reviewer. Summarize the change and flag concrete " +
      "issues only (bugs, missing tests for risky changes, security footguns). " +
      'Respond ONLY with JSON: {"summary": string, "issues": [{"severity": ' +
      '"info"|"warning"|"error", "message": string, "file"?: string}]}.';
    const user = JSON.stringify({ files: diff.files });
    const text = await client.complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return parseJsonResponse<ReviewResult>(text);
  };
}

/** AI-backed test generator for the test-coverage loop. */
export function createTestGenerator(client: AiClient): TestGenerator {
  return async (gaps: CoverageGap[]): Promise<FileChange[]> => {
    const system =
      "You write focused tests covering the given uncovered lines, with meaningful " +
      "assertions. Touch only test files. Respond ONLY with JSON: an array of " +
      '{"path","contents"} (full new contents). Return [] if you cannot write useful tests.';
    const user = JSON.stringify({ gaps });
    const text = await client.complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const files = parseJsonResponse<Array<{ path: string; contents: string }>>(text);
    return files.map((f) => ({ path: f.path, op: "write", contents: f.contents }));
  };
}

/** AI-backed article writer for the kb-gap loop. */
export function createArticleWriter(client: AiClient, kbDir = "docs/kb"): ArticleWriter {
  return async (gaps: KbGap[]) => {
    const system =
      "You write knowledge-base articles that resolve recurring support topics. Write one " +
      "accurate Markdown article per gap, grounded in the provided resolved-ticket resolutions — " +
      `do not invent product behavior. Put each file under "${kbDir}/" with a kebab-case ".md" ` +
      'filename. Respond ONLY with JSON: an array of {"path","contents"}. Return [] if you cannot ' +
      "write a confident article.";
    const user = JSON.stringify({
      kbDir,
      gaps: gaps.map((g) => ({
        topic: g.topic,
        count: g.count,
        examples: g.tickets.slice(0, 5).map((t) => ({ question: t.question, resolution: t.resolution })),
      })),
    });
    const text = await client.complete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return parseJsonResponse<Array<{ path: string; contents: string }>>(text);
  };
}

async function safeResolve(repoRoot: string, globs: string[]): Promise<string[]> {
  try {
    return await resolveFiles(repoRoot, globs);
  } catch {
    return [];
  }
}

async function readMany(
  repoRoot: string,
  paths: string[],
): Promise<Array<{ path: string; contents: string }>> {
  const out: Array<{ path: string; contents: string }> = [];
  for (const path of paths) {
    try {
      out.push({ path, contents: await readFile(join(repoRoot, path), "utf8") });
    } catch {
      // skip unreadable paths
    }
  }
  return out;
}
