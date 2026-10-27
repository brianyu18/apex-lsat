/**
 * Score range and blind-review gap.
 *
 * Score range = mean of the last N (≤5) full-length scaled scores ± a margin of
 * error that shrinks as more tests accumulate: 4 points after one test, down to
 * ~1.6 after five. Untimed tests are excluded by the caller.
 */

export interface ScoredTest {
  scaled: number;
  brScaled?: number | null;
  finishedAt: string | Date;
}

export interface ScoreRange {
  n: number;
  mean: number | null;
  low: number | null;
  high: number | null;
  moe: number | null;
  brMean: number | null;
  brGap: number | null; // brMean - mean
}

export const MAX_TESTS_IN_RANGE = 5;

export function marginOfError(n: number): number {
  if (n <= 0) return 4;
  return Math.max(1, 4 - 0.6 * (Math.min(n, MAX_TESTS_IN_RANGE) - 1));
}

export function scoreRange(tests: ScoredTest[]): ScoreRange {
  const recent = [...tests]
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, MAX_TESTS_IN_RANGE);
  const n = recent.length;
  if (n === 0) return { n: 0, mean: null, low: null, high: null, moe: null, brMean: null, brGap: null };
  const mean = recent.reduce((s, t) => s + t.scaled, 0) / n;
  const moe = marginOfError(n);
  const brs = recent.filter((t) => t.brScaled != null).map((t) => t.brScaled as number);
  const brMean = brs.length ? brs.reduce((s, v) => s + v, 0) / brs.length : null;
  return {
    n,
    mean: round1(mean),
    low: Math.max(120, Math.round(mean - moe)),
    high: Math.min(180, Math.round(mean + moe)),
    moe: round1(moe),
    brMean: brMean == null ? null : round1(brMean),
    brGap: brMean == null ? null : round1(brMean - mean),
  };
}

/** Interpret the BR gap (7Sage heuristic). */
export function interpretBrGap(gap: number | null): { label: string; advice: string } {
  if (gap == null) return { label: "No blind review yet", advice: "Flag uncertain questions during your next timed section, then review them untimed before scoring." };
  if (gap >= 8) return { label: "Large gap — timing & execution", advice: "You know more than you show under time. Prioritize timed sections, pacing checkpoints and skip discipline." };
  if (gap >= 4) return { label: "Moderate gap", advice: "Mix timed sections with untimed review of flagged questions; watch where the minutes go." };
  if (gap >= 1) return { label: "Small gap — near your ceiling", advice: "Timed is close to your knowledge. Raise the ceiling: untimed content drills on your lowest types." };
  return { label: "No gap — content", advice: "Blind review isn't finding more points. Go back to lessons for your weakest types and drill untimed until accuracy > 85%." };
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}
