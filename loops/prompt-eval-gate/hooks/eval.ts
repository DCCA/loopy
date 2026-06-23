/** One eval case: send `input` to the model; pass if the output contains `expect`. */
export interface EvalCase {
  id: string;
  input: string;
  /** substring the output must contain (case-insensitive) to pass */
  expect: string;
}

export interface EvalSource {
  cases(): Promise<EvalCase[]>;
}

/** The model boundary (reuses loopy's AI client in real runs). */
export type Model = (input: string) => Promise<string>;

export interface Scorecard {
  score: number;
  perCase: Record<string, boolean>;
}

export function grade(output: string, c: EvalCase): boolean {
  return output.toLowerCase().includes(c.expect.toLowerCase());
}

/** Run every case through the model and produce a scorecard. */
export async function runEval(cases: EvalCase[], model: Model): Promise<Scorecard> {
  const perCase: Record<string, boolean> = {};
  let pass = 0;
  for (const c of cases) {
    const ok = grade(await model(c.input), c);
    perCase[c.id] = ok;
    if (ok) pass++;
  }
  return { score: cases.length > 0 ? pass / cases.length : 1, perCase };
}

/** Cases that passed in the baseline but fail now (regressions). */
export function regressions(baseline: Scorecard, current: Scorecard): string[] {
  return Object.keys(baseline.perCase)
    .filter((id) => baseline.perCase[id] === true && current.perCase[id] === false)
    .sort();
}

function pct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function renderScorecard(
  current: Scorecard,
  baseline: Scorecard | null,
  regressed: string[],
  note: string,
): string {
  const lines = ["## 🤖 loopy prompt-eval", "", note, ""];
  lines.push(
    `- Score: **${pct(current.score)}**` +
      (baseline ? ` (baseline ${pct(baseline.score)})` : " (new baseline)"),
  );
  if (regressed.length > 0) {
    lines.push("", "### ❌ Regressions", "");
    for (const id of regressed) lines.push(`- \`${id}\` passed in baseline, fails now`);
  }
  lines.push("", "_Advisory eval gate — review before merging. Baseline promotion is human-gated._");
  return lines.join("\n");
}
