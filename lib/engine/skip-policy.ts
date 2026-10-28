/**
 * Skip-decision scoring.
 *
 * In a skip-trainer section the student first decides attempt vs skip for each
 * question on a first pass, then returns to skipped ones. We score the
 * *decisions*, not just the answers:
 *
 *   - attempted and right quickly            → good attempt (+1)
 *   - attempted, right, but very slow        → costly attempt (0): should have skipped first
 *   - attempted and wrong after long dwell   → bad attempt (−1): classic time bleed
 *   - attempted and wrong quickly            → neutral (0): an honest miss
 *   - skipped, then right on return          → good skip (+1)
 *   - skipped, then wrong/blank on return    → neutral (0) if hard, −0.5 if easy (you skipped a gimme)
 *
 * Policy by goal: 170 → 3–4 skips/section; 175+ → ≤ 2. "Slow" = > 1.8× the section median.
 */
export interface SkipDecision {
  questionId: string;
  difficulty: number;
  skippedFirstPass: boolean;
  seconds: number; // total seconds on the question
  correct: boolean | null;
}

export interface SkipScore {
  perQuestion: { questionId: string; verdict: string; points: number }[];
  total: number;
  skips: number;
  recommendedSkips: [number, number];
  timeBleeds: number;
  gimmesSkipped: number;
  summary: string;
}

export function skipPolicyFor(goal: number): [number, number] {
  if (goal >= 175) return [0, 2];
  if (goal >= 170) return [2, 4];
  return [3, 5];
}

export function scoreSkipDecisions(items: SkipDecision[], goal: number): SkipScore {
  const secs = items.map((i) => i.seconds).filter((s) => s > 0).sort((a, b) => a - b);
  const median = secs.length ? secs[Math.floor(secs.length / 2)] : 80;
  const slow = median * 1.8;
  const per = items.map((i) => {
    if (!i.skippedFirstPass) {
      if (i.correct && i.seconds <= slow) return { questionId: i.questionId, verdict: "Clean attempt", points: 1 };
      if (i.correct) return { questionId: i.questionId, verdict: "Right, but it cost you — skip and return", points: 0 };
      if (i.seconds > slow) return { questionId: i.questionId, verdict: "Time bleed: long and wrong", points: -1 };
      return { questionId: i.questionId, verdict: "Honest miss", points: 0 };
    }
    if (i.correct) return { questionId: i.questionId, verdict: "Good skip — banked on return", points: 1 };
    if (i.difficulty <= 2) return { questionId: i.questionId, verdict: "Skipped an easy one and lost it", points: -0.5 };
    return { questionId: i.questionId, verdict: "Reasonable skip, still missed", points: 0 };
  });
  const skips = items.filter((i) => i.skippedFirstPass).length;
  const rec = skipPolicyFor(goal);
  const timeBleeds = per.filter((p) => p.points === -1).length;
  const gimmesSkipped = per.filter((p) => p.points === -0.5).length;
  const total = per.reduce((a, p) => a + p.points, 0);
  let summary: string;
  if (timeBleeds >= 2) summary = `${timeBleeds} time bleeds. The rule: if you don't see the structure in ~45 seconds, flag and move. Each bleed costs you a later question.`;
  else if (skips > rec[1]) summary = `${skips} skips is more than your goal needs (${rec[0]}–${rec[1]}). You're bailing on questions you could bank; trust the first read a bit longer.`;
  else if (gimmesSkipped > 0) summary = `You skipped ${gimmesSkipped} easy question${gimmesSkipped > 1 ? "s" : ""} and didn't get back to ${gimmesSkipped > 1 ? "them" : "it"}. Skips should be hard-looking questions, not short ones.`;
  else if (skips < rec[0]) summary = `Only ${skips} skips. Fine if you finished with time to spare; if you were rushed at the end, skip ${rec[0]}–${rec[1]} and come back.`;
  else summary = `Skip discipline is on policy (${skips} of ${rec[0]}–${rec[1]}) with no time bleeds. This is what a 170+ section looks like.`;
  return { perQuestion: per, total, skips, recommendedSkips: rec, timeBleeds, gimmesSkipped, summary };
}
