/**
 * Guess detection and confidence calibration.
 *
 * Any answer submitted in under GUESS_SECONDS is auto-flagged as a guess (the
 * user can un-flag it). Guesses count toward the score of a timed section but
 * are excluded from accuracy and from rating updates.
 */
export const GUESS_SECONDS = 10;

export type Confidence = "sure" | "leaning" | "guess";

export function isAutoGuess(seconds: number): boolean {
  return seconds < GUESS_SECONDS;
}

/** Final guess flag given timing and explicit confidence. */
export function guessFlag(seconds: number, confidence: Confidence | null | undefined, userOverride?: boolean | null): boolean {
  if (userOverride != null) return userOverride;
  return confidence === "guess" || isAutoGuess(seconds);
}

export interface CalibrationBucket {
  confidence: Confidence;
  n: number;
  correct: number;
  accuracy: number | null;
}

/** Accuracy by confidence bucket. Well-calibrated: sure ≳ 90%, leaning ~60–75%, guess ~20–40%. */
export function calibration(rows: { confidence: Confidence | null; correct: boolean | null }[]): CalibrationBucket[] {
  const out: Record<Confidence, { n: number; correct: number }> = {
    sure: { n: 0, correct: 0 },
    leaning: { n: 0, correct: 0 },
    guess: { n: 0, correct: 0 },
  };
  for (const r of rows) {
    if (!r.confidence || r.correct == null) continue;
    out[r.confidence].n++;
    if (r.correct) out[r.confidence].correct++;
  }
  return (["sure", "leaning", "guess"] as Confidence[]).map((c) => ({
    confidence: c,
    n: out[c].n,
    correct: out[c].correct,
    accuracy: out[c].n ? out[c].correct / out[c].n : null,
  }));
}

/** Short coaching line from calibration data. */
export function calibrationAdvice(b: CalibrationBucket[]): string | null {
  const sure = b.find((x) => x.confidence === "sure");
  const leaning = b.find((x) => x.confidence === "leaning");
  if (sure && sure.n >= 20 && sure.accuracy != null && sure.accuracy < 0.85) {
    return `You're "sure" ${Math.round(sure.accuracy * 100)}% of the time you're right. Slow down on the last two answer choices — overconfidence is costing points.`;
  }
  if (leaning && leaning.n >= 20 && leaning.accuracy != null && leaning.accuracy > 0.85) {
    return `Your "leaning" answers are right ${Math.round(leaning.accuracy * 100)}% of the time — trust them and move on faster.`;
  }
  return null;
}
