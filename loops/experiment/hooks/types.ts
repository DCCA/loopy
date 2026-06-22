/** A testable hypothesis for an experiment. */
export interface Hypothesis {
  id: string;
  statement: string;
  /** the primary success metric */
  metric: string;
  /** metrics that must not regress */
  guardrailMetrics?: string[];
  /** the surface/area the experiment runs on */
  surface?: string;
}

/** A concrete experiment design produced from a hypothesis. */
export interface ExperimentDesign {
  variants: string[];
  metric: string;
  guardrailMetrics: string[];
  minSampleSize: number;
  durationDays: number;
}

/** The outcome of a baked experiment. */
export interface ExperimentResults {
  significant: boolean;
  metricDelta: number;
  guardrailBreached: boolean;
  recommendation: "ship" | "kill" | "iterate";
}

/** The AI step (driven by `playbook.md`): design an experiment from a hypothesis. */
export type ExperimentDesigner = (hypothesis: Hypothesis) => Promise<ExperimentDesign>;

/** The experimentation-platform boundary (Statsig/Eppo/GrowthBook/LaunchDarkly, etc.). */
export interface ExperimentPlatform {
  launch(hypothesis: Hypothesis, design: ExperimentDesign): Promise<{ experimentKey: string }>;
  /** results once the experiment has baked, or null while still running */
  results(experimentKey: string): Promise<ExperimentResults | null>;
}
