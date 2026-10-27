/**
 * Pacing checkpoints and time-bleed analysis for a timed section.
 *
 * LR (35 min, ~25 Q): Q10 by ~9 min, Q15 by ~15, Q20 by ~24, Q25 by ~33.
 * Expressed as a cumulative-time curve so it scales to 24–26 questions and to
 * accommodated timings.
 */
export interface PacingPoint {
  index: number; // 0-based question index
  cumulativeSec: number;
  targetSec: number;
  deltaSec: number; // positive = behind
}

/** Target cumulative seconds at the end of question i (0-based) for an n-question LR section. */
export function lrTargetCumulative(i: number, n: number, totalSec = 35 * 60): number {
  // Piecewise: early questions ~75% of average, middle ~100%, late ~120%, leave ~2 min buffer.
  const avg = (totalSec - 120) / n;
  let t = 0;
  for (let k = 0; k <= i; k++) {
    const p = k / (n - 1);
    const w = p < 0.3 ? 0.75 : p < 0.65 ? 1.0 : 1.2;
    t += avg * w;
  }
  return Math.round(t);
}

export function pacingCurve(secondsPerQuestion: number[], totalSec = 35 * 60): PacingPoint[] {
  const n = secondsPerQuestion.length;
  let cum = 0;
  return secondsPerQuestion.map((s, i) => {
    cum += s;
    const target = lrTargetCumulative(i, n, totalSec);
    return { index: i, cumulativeSec: Math.round(cum), targetSec: target, deltaSec: Math.round(cum - target) };
  });
}

/** Questions where you spent more than `factor` × the section's median time (time bleeds). */
export function timeBleeds(secondsPerQuestion: number[], factor = 2): number[] {
  const sorted = [...secondsPerQuestion].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return secondsPerQuestion.map((s, i) => (s > median * factor ? i : -1)).filter((i) => i >= 0);
}

export const LR_CHECKPOINTS = [
  { afterQuestion: 10, minutes: 9 },
  { afterQuestion: 15, minutes: 15 },
  { afterQuestion: 20, minutes: 24 },
  { afterQuestion: 25, minutes: 33 },
];
