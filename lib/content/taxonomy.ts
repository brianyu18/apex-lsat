/**
 * Single source of truth for the LSAT taxonomy used across the app:
 * LR question types (with natural drill pairs and per-section frequency),
 * cross-type logic tags, RC passage styles, RC question types, trap patterns,
 * and the 4-level difficulty rubric.
 *
 * Frequencies are averages per 25-question LR section on current-format tests
 * (PT150–159), from 7Sage's published type statistics. They drive the
 * Priorities ranking, bank generation targets, and timed-section assembly.
 */

export type Section = "LR" | "RC";

/* ---------------- LR question types ---------------- */

export const LR_TYPES = [
  "flaw",
  "most_strongly_supported",
  "necessary_assumption",
  "weaken",
  "resolve_explain",
  "strengthen",
  "pseudo_sufficient_assumption",
  "sufficient_assumption",
  "main_conclusion",
  "argument_part",
  "parallel_flaw",
  "parallel_method",
  "point_at_issue",
  "must_be_true",
  "fill_in_blank",
  "method_of_reasoning",
  "principle",
  "psa_application",
  "inference",
  "evaluate",
  "must_be_false",
  "point_of_agreement",
] as const;
export type LRType = (typeof LR_TYPES)[number];

export interface LRTypeInfo {
  id: LRType;
  label: string;
  short: string;
  /** average count per 25-question section */
  freq: number;
  /** drill pair group (Demon-style natural pairs) */
  pair: LRPair;
  /** one-line description of the task */
  task: string;
}

export const LR_PAIRS = [
  "weaken_flaw",
  "strengthen_support",
  "assumptions",
  "explain_disagree",
  "conclusion_evaluate",
  "method_parallel",
  "structure",
  "rules_principles",
] as const;
export type LRPair = (typeof LR_PAIRS)[number];

export const LR_PAIR_LABELS: Record<LRPair, string> = {
  weaken_flaw: "Weaken & Flaw",
  strengthen_support: "Strengthen, MSS & Must Be True",
  assumptions: "Necessary & Sufficient Assumption",
  explain_disagree: "Explain & Point at Issue",
  conclusion_evaluate: "Main Conclusion & Evaluate",
  method_parallel: "Method & Parallel",
  structure: "Argument Part & Fill-in-the-Blank",
  rules_principles: "Principle & Rule Application",
};

export const LR_TYPE_INFO: Record<LRType, LRTypeInfo> = {
  flaw: { id: "flaw", label: "Flaw", short: "Flaw", freq: 3.85, pair: "weaken_flaw", task: "Describe the reasoning error in the argument." },
  most_strongly_supported: { id: "most_strongly_supported", label: "Most Strongly Supported", short: "MSS", freq: 2.45, pair: "strengthen_support", task: "Pick the statement the facts best support." },
  necessary_assumption: { id: "necessary_assumption", label: "Necessary Assumption", short: "NA", freq: 2.25, pair: "assumptions", task: "Find what the argument requires to be true." },
  weaken: { id: "weaken", label: "Weaken", short: "Weaken", freq: 2.25, pair: "weaken_flaw", task: "Pick the fact that most undermines the argument." },
  resolve_explain: { id: "resolve_explain", label: "Resolve / Explain", short: "Explain", freq: 1.95, pair: "explain_disagree", task: "Explain an apparent discrepancy." },
  strengthen: { id: "strengthen", label: "Strengthen", short: "Strengthen", freq: 1.9, pair: "strengthen_support", task: "Pick the fact that most supports the argument." },
  pseudo_sufficient_assumption: { id: "pseudo_sufficient_assumption", label: "Principle (Justify)", short: "PSA", freq: 1.35, pair: "rules_principles", task: "Find the rule that, if valid, most justifies the reasoning." },
  sufficient_assumption: { id: "sufficient_assumption", label: "Sufficient Assumption", short: "SA", freq: 1.35, pair: "assumptions", task: "Find the premise that guarantees the conclusion." },
  main_conclusion: { id: "main_conclusion", label: "Main Conclusion", short: "MC", freq: 1.25, pair: "conclusion_evaluate", task: "Identify the main conclusion." },
  argument_part: { id: "argument_part", label: "Argument Part", short: "AP", freq: 1.1, pair: "structure", task: "Describe the role a statement plays." },
  parallel_flaw: { id: "parallel_flaw", label: "Parallel Flaw", short: "P-Flaw", freq: 1.0, pair: "method_parallel", task: "Match the flawed reasoning pattern." },
  parallel_method: { id: "parallel_method", label: "Parallel Reasoning", short: "Parallel", freq: 1.0, pair: "method_parallel", task: "Match the valid reasoning pattern." },
  point_at_issue: { id: "point_at_issue", label: "Point at Issue", short: "PAI", freq: 1.0, pair: "explain_disagree", task: "Find what two speakers disagree about." },
  must_be_true: { id: "must_be_true", label: "Must Be True", short: "MBT", freq: 0.95, pair: "strengthen_support", task: "Pick what the facts guarantee." },
  fill_in_blank: { id: "fill_in_blank", label: "Fill in the Blank", short: "Blank", freq: 0.8, pair: "structure", task: "Complete the argument logically." },
  method_of_reasoning: { id: "method_of_reasoning", label: "Method of Reasoning", short: "Method", freq: 0.75, pair: "method_parallel", task: "Describe how the argument proceeds." },
  principle: { id: "principle", label: "Principle (Conform)", short: "Principle", freq: 0.4, pair: "rules_principles", task: "Pick the principle the situation conforms to." },
  psa_application: { id: "psa_application", label: "Rule Application", short: "Apply", freq: 0.35, pair: "rules_principles", task: "Apply a stated rule to a case." },
  inference: { id: "inference", label: "Inference", short: "Infer", freq: 0.25, pair: "strengthen_support", task: "Draw the supported inference." },
  evaluate: { id: "evaluate", label: "Evaluate", short: "Evaluate", freq: 0.1, pair: "conclusion_evaluate", task: "Pick the question whose answer bears most on the argument." },
  must_be_false: { id: "must_be_false", label: "Must Be False", short: "MBF", freq: 0.1, pair: "strengthen_support", task: "Pick what cannot be true given the facts." },
  point_of_agreement: { id: "point_of_agreement", label: "Point of Agreement", short: "Agree", freq: 0.1, pair: "explain_disagree", task: "Find what two speakers agree about." },
};

/** Typical scored LR section length (24–26). Type frequencies above sum to ~26.5; use `lrTypeShare` for proportions. */
export const LR_SECTION_QUESTIONS = 25;
export const LR_FREQ_TOTAL = LR_TYPES.reduce((s, t) => s + LR_TYPE_INFO[t].freq, 0);

/** Types sorted by expected frequency (the teaching order for Unit 2). */
export const LR_TYPES_BY_FREQ = [...LR_TYPES].sort((a, b) => LR_TYPE_INFO[b].freq - LR_TYPE_INFO[a].freq);

export function lrTypesInPair(pair: LRPair): LRType[] {
  return LR_TYPES.filter((t) => LR_TYPE_INFO[t].pair === pair);
}

/* ---------------- Logic tags (cross-type reasoning patterns) ---------------- */

export const LOGIC_TAGS = [
  "conditional",
  "causation",
  "quantifiers",
  "link_assumption",
  "analogy",
  "eliminating_options",
  "value_judgment",
  "weighing_factors",
  "mental_state_v_reality",
  "sampling",
  "part_v_whole",
  "lack_of_support_v_false",
  "math_percent",
  "rule_application",
  "comparison",
  "definition_scope",
] as const;
export type LogicTag = (typeof LOGIC_TAGS)[number];

export const LOGIC_TAG_LABELS: Record<LogicTag, string> = {
  conditional: "Conditional logic",
  causation: "Causation",
  quantifiers: "Quantifiers (some/most/all)",
  link_assumption: "Link assumption (bridge)",
  analogy: "Analogy",
  eliminating_options: "Eliminating options",
  value_judgment: "Value judgment / ought",
  weighing_factors: "Weighing factors",
  mental_state_v_reality: "Mental state vs reality",
  sampling: "Sampling / survey",
  part_v_whole: "Part vs whole",
  lack_of_support_v_false: "Lack of support ≠ false",
  math_percent: "Numbers & percentages",
  rule_application: "Rule application",
  comparison: "Comparison / relative vs absolute",
  definition_scope: "Definition & scope shift",
};

/* ---------------- RC ---------------- */

export const RC_STYLES = [
  "critique_debate",
  "single_position",
  "phenomenon_hypothesis",
  "problem_analysis",
  "spotlight",
] as const;
export type RCStyle = (typeof RC_STYLES)[number];
export const RC_STYLE_LABELS: Record<RCStyle, string> = {
  critique_debate: "Critique or debate",
  single_position: "Single position",
  phenomenon_hypothesis: "Phenomenon → hypothesis",
  problem_analysis: "Problem → analysis",
  spotlight: "Spotlight (person or work)",
};

export const RC_TOPICS = ["law", "humanities", "social_science", "natural_science"] as const;
export type RCTopic = (typeof RC_TOPICS)[number];

export const RC_QTYPES = [
  "stated",
  "author_perspective",
  "main_point",
  "purpose_in_context",
  "meaning_in_context",
  "other_perspective",
  "purpose_of_passage",
  "weaken_strengthen_evaluate",
  "analogy",
  "application",
  "author_attitude",
  "principle",
  "purpose_of_paragraph",
  "organization",
  "relationship",
  "approach",
] as const;
export type RCQType = (typeof RC_QTYPES)[number];

export interface RCQTypeInfo {
  id: RCQType;
  label: string;
  /** average count per 27-question RC section */
  freq: number;
  /** comparative passages only */
  comparativeOnly?: boolean;
}
export const RC_QTYPE_INFO: Record<RCQType, RCQTypeInfo> = {
  stated: { id: "stated", label: "Stated (detail)", freq: 4.9 },
  author_perspective: { id: "author_perspective", label: "Author's perspective (implied)", freq: 3.3 },
  main_point: { id: "main_point", label: "Main point", freq: 2.3 },
  purpose_in_context: { id: "purpose_in_context", label: "Purpose in context", freq: 2.0 },
  meaning_in_context: { id: "meaning_in_context", label: "Meaning in context", freq: 1.9 },
  other_perspective: { id: "other_perspective", label: "Other's perspective", freq: 1.6 },
  purpose_of_passage: { id: "purpose_of_passage", label: "Purpose of passage", freq: 1.3 },
  weaken_strengthen_evaluate: { id: "weaken_strengthen_evaluate", label: "Weaken / strengthen / evaluate", freq: 1.3 },
  analogy: { id: "analogy", label: "Analogy", freq: 0.9 },
  application: { id: "application", label: "Application", freq: 0.9 },
  author_attitude: { id: "author_attitude", label: "Author's attitude", freq: 0.8 },
  principle: { id: "principle", label: "Principle", freq: 0.6 },
  purpose_of_paragraph: { id: "purpose_of_paragraph", label: "Purpose of paragraph", freq: 0.6 },
  organization: { id: "organization", label: "Organization", freq: 0.5 },
  relationship: { id: "relationship", label: "Relationship between passages", freq: 0.3, comparativeOnly: true },
  approach: { id: "approach", label: "Approach of each passage", freq: 0.1, comparativeOnly: true },
};
export const RC_SECTION_QUESTIONS = 27;

export const PARAGRAPH_ROLES = [
  "context",
  "main_point",
  "support",
  "counterpoint",
  "concession",
  "example",
  "implication",
  "transition",
] as const;
export type ParagraphRole = (typeof PARAGRAPH_ROLES)[number];

/* ---------------- Trap patterns (why a wrong answer tempts) ---------------- */

export const TRAP_PATTERNS = [
  "out_of_scope",
  "wrong_force",
  "reversal",
  "premise_booster",
  "half_right",
  "opposite",
  "extreme",
  "shell_game",
  "comparison_shift",
  "wrong_part",
  "true_but_irrelevant",
  "necessary_v_sufficient",
] as const;
export type TrapPattern = (typeof TRAP_PATTERNS)[number];
export const TRAP_LABELS: Record<TrapPattern, string> = {
  out_of_scope: "Out of scope",
  wrong_force: "Wrong logical force (too weak/strong for the task)",
  reversal: "Reversed relationship",
  premise_booster: "Restates or supports a premise, not the gap",
  half_right: "Half right, half wrong",
  opposite: "Does the opposite of the task",
  extreme: "Extreme language the text can't support",
  shell_game: "Swaps a nearby concept for the one at issue",
  comparison_shift: "Shifts between relative and absolute",
  wrong_part: "Describes the wrong part of the argument",
  true_but_irrelevant: "True in the world, irrelevant to the argument",
  necessary_v_sufficient: "Confuses necessary and sufficient",
};

/* ---------------- Difficulty ---------------- */

export const DIFFICULTY_LEVELS = [1, 2, 3, 4] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];
export const DIFFICULTY_RUBRIC: Record<Difficulty, { label: string; expectedAccuracy: [number, number]; rubric: string }> = {
  1: { label: "Level 1", expectedAccuracy: [0.85, 1.0], rubric: "Short stimulus, explicit conclusion, one obvious gap, wrong answers clearly off." },
  2: { label: "Level 2", expectedAccuracy: [0.7, 0.85], rubric: "Standard length, one plausible trap answer, familiar pattern." },
  3: { label: "Level 3", expectedAccuracy: [0.5, 0.7], rubric: "Abstract or dense wording, two tempting traps, subtle scope or force issue." },
  4: { label: "Level 4", expectedAccuracy: [0.2, 0.5], rubric: "Abstract structure, correct answer phrased unexpectedly, best trap nearly indistinguishable." },
};
/** Target bank distribution across levels 1–4. */
export const DIFFICULTY_TARGET_SHARE: Record<Difficulty, number> = { 1: 0.25, 2: 0.35, 3: 0.25, 4: 0.15 };

/** Elo-style opponent rating per difficulty level. */
export const DIFFICULTY_RATING: Record<Difficulty, number> = { 1: 1200, 2: 1450, 3: 1700, 4: 1950 };

export const CHOICES = ["A", "B", "C", "D", "E"] as const;
export type Choice = (typeof CHOICES)[number];

/** Share of an LR section expected to be this type (sums to 1 across types). */
export function lrTypeShare(t: LRType): number {
  return LR_TYPE_INFO[t].freq / LR_FREQ_TOTAL;
}
