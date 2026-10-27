import { describe, expect, it } from "vitest";
import { classify, type ClassifyInput } from "@/lib/engine/classify";
import { advance, nextDue, pickSimilar } from "@/lib/engine/srs";

const base: ClassifyInput = { correct: false, guessFlag: false, seconds: 70, confidence: "leaning", changedFrom: null, myTrap: null, difficulty: 2 };

/** Seeded set with ground-truth labels a human reviewer would give. */
const seeded: { input: Partial<ClassifyInput>; truth: string }[] = [
  { input: { changedFrom: "C", changedFromWasCorrect: true }, truth: "careless" },
  { input: { guessFlag: true, seconds: 6 }, truth: "time_pressure" },
  { input: { confidence: "guess", seconds: 40 }, truth: "time_pressure" },
  { input: { seconds: 200 }, truth: "time_pressure" },
  { input: { confidence: "sure", seconds: 30 }, truth: "misread" },
  { input: { myTrap: "opposite", seconds: 80 }, truth: "misread" },
  { input: { myTrap: "reversal", seconds: 80 }, truth: "misread" },
  { input: { myTrap: "wrong_part", seconds: 80 }, truth: "misread" },
  { input: { myTrap: "necessary_v_sufficient", seconds: 90 }, truth: "logic_gap" },
  { input: { myTrap: "wrong_force", seconds: 90 }, truth: "logic_gap" },
  { input: { myTrap: "shell_game", seconds: 90 }, truth: "logic_gap" },
  { input: { myTrap: "out_of_scope", seconds: 90 }, truth: "trap" },
  { input: { myTrap: "premise_booster", seconds: 90 }, truth: "trap" },
  { input: { myTrap: "extreme", seconds: 90 }, truth: "trap" },
  { input: { myTrap: "true_but_irrelevant", seconds: 90 }, truth: "trap" },
  { input: { seconds: 90 }, truth: "logic_gap" },
  { input: { correct: true, guessFlag: true }, truth: "guessed_right" },
  { input: { myTrap: "half_right", seconds: 100, confidence: "sure" }, truth: "logic_gap" },
  { input: { myTrap: "comparison_shift", seconds: 85 }, truth: "logic_gap" },
  { input: { myTrap: "extreme", seconds: 95, confidence: "leaning" }, truth: "trap" },
];

describe("classify", () => {
  it("matches the seeded ground truth ≥ 70%", () => {
    let hit = 0;
    for (const s of seeded) if (classify({ ...base, ...s.input }).errorType === s.truth) hit++;
    expect(hit / seeded.length).toBeGreaterThanOrEqual(0.7);
  });
  it("switching off the correct answer is careless even with a trap present", () => {
    expect(classify({ ...base, changedFrom: "A", changedFromWasCorrect: true, myTrap: "extreme" }).errorType).toBe("careless");
  });
});

describe("srs", () => {
  it("box intervals are 3/5/10 days, graduated has no due date", () => {
    const from = new Date("2026-11-01T12:00:00");
    expect(nextDue(1, from)).toBe("2026-11-04");
    expect(nextDue(2, from)).toBe("2026-11-06");
    expect(nextDue(3, from)).toBe("2026-11-11");
    expect(nextDue(4, from)).toBeNull();
  });
  it("advances on correct, resets on miss or guess", () => {
    expect(advance(1, true, false)).toBe(2);
    expect(advance(3, true, false)).toBe(4);
    expect(advance(3, false, false)).toBe(1);
    expect(advance(2, true, true)).toBe(1);
  });
  it("pairs with a different question of the same type, sharing a tag and level when possible", () => {
    const pool = [
      { id: "a", type: "flaw", logicTags: ["causation"], difficulty: 2 },
      { id: "b", type: "flaw", logicTags: ["causation"], difficulty: 2 },
      { id: "c", type: "flaw", logicTags: ["sampling"], difficulty: 2 },
      { id: "d", type: "weaken", logicTags: ["causation"], difficulty: 2 },
    ];
    const pick = pickSimilar(pool[0], pool, () => 0);
    expect(pick?.id).toBe("b");
    expect(pickSimilar({ id: "z", type: "principle", logicTags: [], difficulty: 1 }, pool)).toBeNull();
  });
});
