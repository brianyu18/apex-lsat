/**
 * Study Quality — one 0–100 number for the trailing 30 days, so "am I studying
 * well?" has an answer that isn't just hours.
 *
 *   accuracy     28  counted accuracy (guess-flagged excluded), 50% → 0, 85% → full; scaled by sample size up to 40
 *   consistency  27  days studied vs. the days-per-week goal over the window
 *   review       26  share of misses that have been reviewed (classified) within the window
 *   duration     10  study minutes vs. the hours-per-week goal over the window
 *   variety       9  distinct activity kinds used (lesson, drill, review, timed section, PT, RC, writing)
 */
export interface QualityInput {
  windowDays: number; // usually 30
  counted: number; // attempts with confidence/not guess-flagged
  correct: number;
  daysStudied: number;
  daysPerWeekGoal: number;
  missesInWindow: number;
  missesReviewed: number;
  studyMinutes: number;
  hoursPerWeekGoal: number;
  activityKinds: string[]; // distinct kinds seen
}

export const ACTIVITY_KINDS = ["lesson", "drill", "review", "section", "pt", "rc", "writing"] as const;

export interface QualityScore {
  total: number;
  parts: { key: "accuracy" | "consistency" | "review" | "duration" | "variety"; label: string; points: number; max: number; detail: string }[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function studyQuality(i: QualityInput): QualityScore {
  const weeks = i.windowDays / 7;

  const acc = i.counted ? i.correct / i.counted : 0;
  const accScaled = clamp01((acc - 0.5) / 0.35) * clamp01(i.counted / 40);
  const accuracy = Math.round(accScaled * 28);

  const dayGoal = i.daysPerWeekGoal * weeks;
  const consistency = Math.round(clamp01(dayGoal ? i.daysStudied / dayGoal : 0) * 27);

  // No misses yet → no review debt; give full credit only once there is something to review.
  const reviewShare = i.missesInWindow ? i.missesReviewed / i.missesInWindow : i.counted >= 20 ? 1 : 0;
  const review = Math.round(clamp01(reviewShare) * 26);

  const minGoal = i.hoursPerWeekGoal * 60 * weeks;
  const duration = Math.round(clamp01(minGoal ? i.studyMinutes / minGoal : 0) * 10);

  const kinds = new Set(i.activityKinds.filter((k) => (ACTIVITY_KINDS as readonly string[]).includes(k)));
  const variety = Math.round(clamp01(kinds.size / 6) * 9); // 6 of 7 kinds is "full variety"

  const parts: QualityScore["parts"] = [
    { key: "accuracy", label: "Accuracy", points: accuracy, max: 28, detail: i.counted ? `${Math.round(acc * 100)}% over ${i.counted} counted` : "no counted attempts" },
    { key: "consistency", label: "Consistency", points: consistency, max: 27, detail: `${i.daysStudied} of ${Math.round(dayGoal)} planned days` },
    { key: "review", label: "Review", points: review, max: 26, detail: i.missesInWindow ? `${i.missesReviewed}/${i.missesInWindow} misses reviewed` : "no misses to review" },
    { key: "duration", label: "Time", points: duration, max: 10, detail: `${Math.round(i.studyMinutes / 60)} of ${Math.round(minGoal / 60)} planned hours` },
    { key: "variety", label: "Variety", points: variety, max: 9, detail: `${kinds.size} of 7 activity kinds` },
  ];
  return { total: parts.reduce((a, p) => a + p.points, 0), parts };
}

export function qualityBand(total: number): { label: string; advice: string } {
  if (total >= 85) return { label: "Excellent", advice: "This is how a top score gets built. Keep the mix." };
  if (total >= 65) return { label: "Good", advice: "Solid. Look at the lowest component below for the cheapest improvement." };
  if (total >= 40) return { label: "Uneven", advice: "Hours alone don't move the score. Fix the lowest component this week." };
  return { label: "Just starting", advice: "Build the habit first: planned days, then review every miss." };
}
