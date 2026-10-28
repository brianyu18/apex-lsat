import { describe, expect, it } from "vitest";
import { scoreSkipDecisions, skipPolicyFor } from "@/lib/engine/skip-policy";

describe("skip policy", () => {
  it("policy tightens with goal", () => {
    expect(skipPolicyFor(165)).toEqual([3, 5]);
    expect(skipPolicyFor(170)).toEqual([2, 4]);
    expect(skipPolicyFor(177)).toEqual([0, 2]);
  });
  it("scores decisions and flags time bleeds and skipped gimmes", () => {
    const base = Array.from({ length: 20 }, (_, i) => ({ questionId: `q${i}`, difficulty: 2, skippedFirstPass: false, seconds: 70, correct: true }));
    const items = [
      ...base,
      { questionId: "bleed", difficulty: 4, skippedFirstPass: false, seconds: 240, correct: false },
      { questionId: "slowRight", difficulty: 3, skippedFirstPass: false, seconds: 200, correct: true },
      { questionId: "goodSkip", difficulty: 4, skippedFirstPass: true, seconds: 90, correct: true },
      { questionId: "gimme", difficulty: 1, skippedFirstPass: true, seconds: 20, correct: false },
    ];
    const s = scoreSkipDecisions(items, 172);
    const v = Object.fromEntries(s.perQuestion.map((p) => [p.questionId, p]));
    expect(v.bleed.points).toBe(-1);
    expect(v.slowRight.points).toBe(0);
    expect(v.goodSkip.points).toBe(1);
    expect(v.gimme.points).toBe(-0.5);
    expect(s.timeBleeds).toBe(1);
    expect(s.gimmesSkipped).toBe(1);
    expect(s.skips).toBe(2);
    expect(s.total).toBe(20 + 0 - 1 + 1 - 0.5);
  });
});
