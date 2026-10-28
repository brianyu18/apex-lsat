/**
 * Priorities — where the next point is cheapest.
 *
 *   priority = (1 − accuracy) × expected questions per test
 *
 * Expected questions per test: LR type frequency is per section and the test
 * has two scored LR sections, so ×2; RC question types are per section, ×1.
 * The product is "expected points lost per test" on that skill. Small samples
 * are shrunk toward a neutral prior (70%) so three misses in four attempts
 * don't top the list over a steady 60% across forty.
 */
export interface PriorityInput {
  key: string;
  label: string;
  dimension: "type" | "tag" | "rc_qtype" | "rc_style";
  n: number; // counted attempts (guess-flagged excluded)
  correct: number;
  /** expected appearances per scored test */
  perTest: number;
}

export interface PriorityRow extends PriorityInput {
  accuracy: number | null; // raw
  shrunk: number; // shrunk accuracy used for ranking
  lostPerTest: number; // (1 − shrunk) × perTest
  status: "ranked" | "thin"; // thin = n < MIN_N
}

export const MIN_N = 5;
const PRIOR_ACC = 0.7;
const PRIOR_WEIGHT = 4;

export function shrinkAccuracy(correct: number, n: number): number {
  return (correct + PRIOR_ACC * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
}

export function rankPriorities(inputs: PriorityInput[]): PriorityRow[] {
  const rows = inputs.map((i) => {
    const shrunk = shrinkAccuracy(i.correct, i.n);
    return {
      ...i,
      accuracy: i.n ? i.correct / i.n : null,
      shrunk,
      lostPerTest: Math.round((1 - shrunk) * i.perTest * 100) / 100,
      status: i.n >= MIN_N ? ("ranked" as const) : ("thin" as const),
    };
  });
  return rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ranked" ? -1 : 1;
    return b.lostPerTest - a.lostPerTest;
  });
}

/** Sum of expected lost points across ranked rows — "points on the table". */
export function pointsOnTable(rows: PriorityRow[]): number {
  return Math.round(rows.filter((r) => r.status === "ranked").reduce((a, r) => a + r.lostPerTest, 0) * 10) / 10;
}
