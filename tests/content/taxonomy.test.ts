import { describe, expect, it } from "vitest";
import {
  LR_FREQ_TOTAL,
  LR_PAIRS,
  LR_SECTION_QUESTIONS,
  LR_TYPES,
  LR_TYPE_INFO,
  RC_QTYPES,
  RC_QTYPE_INFO,
  RC_SECTION_QUESTIONS,
  lrTypesInPair,
  DIFFICULTY_TARGET_SHARE,
} from "@/lib/content/taxonomy";
import { LRQuestionSchema } from "@/lib/content/schema";

describe("taxonomy", () => {
  it("LR frequencies sum to about one section", () => {
    expect(LR_FREQ_TOTAL).toBeGreaterThan(LR_SECTION_QUESTIONS - 0.5);
    expect(LR_FREQ_TOTAL).toBeLessThan(LR_SECTION_QUESTIONS + 2);
  });
  it("RC frequencies sum to about one section", () => {
    const total = RC_QTYPES.reduce((s, t) => s + RC_QTYPE_INFO[t].freq, 0);
    expect(total).toBeGreaterThan(RC_SECTION_QUESTIONS - 5);
    expect(total).toBeLessThan(RC_SECTION_QUESTIONS + 1);
  });
  it("every LR type belongs to exactly one pair", () => {
    const seen = new Map<string, number>();
    for (const p of LR_PAIRS) for (const t of lrTypesInPair(p)) seen.set(t, (seen.get(t) ?? 0) + 1);
    for (const t of LR_TYPES) expect(seen.get(t), t).toBe(1);
    for (const t of LR_TYPES) expect(LR_PAIRS).toContain(LR_TYPE_INFO[t].pair);
  });
  it("difficulty shares sum to 1", () => {
    const s = Object.values(DIFFICULTY_TARGET_SHARE).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
});

const good = {
  id: "lr-test-flaw-1",
  section: "LR",
  type: "flaw",
  logicTags: ["causation"],
  difficulty: 2,
  stimulus: "Cities that added bike lanes last year saw cycling injuries rise. Therefore bike lanes make cycling more dangerous.",
  stem: "The reasoning in the argument is most vulnerable to criticism on the grounds that it",
  choices: {
    A: "overlooks the possibility that more people cycled after lanes were added",
    B: "relies on a sample of cities that is too small",
    C: "assumes that injuries are the only measure of danger",
    D: "confuses a necessary condition with a sufficient one",
    E: "fails to define what counts as a bike lane",
  },
  answer: "A",
  explanations: { A: "Correct: more riders, more injuries, same per-rider risk.", B: "No sample size is mentioned.", C: "Not the gap.", D: "No conditional reasoning here.", E: "Irrelevant." },
  trapPatterns: { B: "out_of_scope", C: "true_but_irrelevant", D: "necessary_v_sufficient", E: "out_of_scope" },
  keyTakeaway: "A rise in a raw count may just reflect a rise in the base population.",
};

describe("LRQuestionSchema", () => {
  it("accepts a well-formed question", () => {
    expect(LRQuestionSchema.safeParse(good).success).toBe(true);
  });
  it("rejects four choices", () => {
    const { E: _e, ...four } = good.choices; // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(LRQuestionSchema.safeParse({ ...good, choices: four }).success).toBe(false);
  });
  it("rejects a trap pattern on the correct answer and a missing one on a wrong answer", () => {
    expect(LRQuestionSchema.safeParse({ ...good, trapPatterns: { ...good.trapPatterns, A: "extreme" } }).success).toBe(false);
    const { E: _e, ...missing } = good.trapPatterns; // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(LRQuestionSchema.safeParse({ ...good, trapPatterns: missing }).success).toBe(false);
  });
  it("rejects duplicate choices", () => {
    expect(LRQuestionSchema.safeParse({ ...good, choices: { ...good.choices, E: good.choices.A } }).success).toBe(false);
  });
});
