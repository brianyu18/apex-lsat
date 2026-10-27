import { describe, expect, it } from "vitest";
import { expectedScore, ratingToPercent, skillLevel, updateRating, type RatingState } from "@/lib/engine/rating";
import { calibration, guessFlag, isAutoGuess } from "@/lib/engine/guess";
import { DEFAULT_CONTEXT, nextQuestion, type Candidate, type SelectionContext } from "@/lib/engine/select";
import type { Difficulty } from "@/lib/content/taxonomy";

/** Deterministic PRNG for reproducible simulations. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("rating", () => {
  it("converges to ≈1700 for a true level-3 student within 60 questions", () => {
    const rng = mulberry32(7);
    const TRUE = 1700;
    let s: RatingState = { rating: 1450, n: 0, correct: 0 };
    for (let i = 0; i < 60; i++) {
      const d = ((i % 4) + 1) as Difficulty;
      const pCorrect = expectedScore(TRUE, d);
      s = updateRating(s, d, rng() < pCorrect);
    }
    expect(Math.abs(s.rating - TRUE)).toBeLessThan(90);
  });
  it("skill level thresholds behave", () => {
    expect(skillLevel(1200)).toBe(1);
    expect(skillLevel(1600)).toBe(2);
    expect(skillLevel(1850)).toBe(3);
    expect(skillLevel(2100)).toBe(4);
  });
  it("percent display maps 1450 → 50", () => {
    expect(ratingToPercent(1450)).toBe(50);
    expect(ratingToPercent(1700)).toBe(75);
  });
});

describe("guess", () => {
  it("flags under 10 seconds, not at 10", () => {
    expect(isAutoGuess(9.9)).toBe(true);
    expect(isAutoGuess(10)).toBe(false);
    expect(guessFlag(30, "guess")).toBe(true);
    expect(guessFlag(5, "sure")).toBe(true);
    expect(guessFlag(5, "sure", false)).toBe(false);
  });
  it("calibration returns three buckets", () => {
    const b = calibration([
      { confidence: "sure", correct: true },
      { confidence: "sure", correct: false },
      { confidence: "guess", correct: false },
    ]);
    expect(b.map((x) => x.confidence)).toEqual(["sure", "leaning", "guess"]);
    expect(b[0].accuracy).toBe(0.5);
    expect(b[1].accuracy).toBeNull();
  });
});

function bank(n: number, section: "LR" | "RC" = "LR"): Candidate[] {
  const types = ["flaw", "weaken", "strengthen", "necessary_assumption"];
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    section,
    type: types[i % types.length],
    logicTags: i % 3 === 0 ? ["causation"] : ["conditional"],
    difficulty: ((i % 4) + 1) as Difficulty,
    source: "bank",
    reservedForTimed: i % 10 === 9,
    lastSeenAt: null,
    timesSeen: 0,
  }));
}

function ctx(over: Partial<SelectionContext> = {}): SelectionContext {
  return { ...DEFAULT_CONTEXT, section: "LR", rating: 1600, now: new Date("2026-11-01"), rng: mulberry32(1), ...over };
}

describe("nextQuestion", () => {
  it("never exceeds skill level in auto mode with no stretch", () => {
    const c = ctx({ randomDifficultyPct: 0, rating: 1600 }); // skill level 2
    const cands = bank(200);
    for (let i = 0; i < 500; i++) {
      const q = nextQuestion(cands, c);
      expect(q).not.toBeNull();
      expect(q!.difficulty).toBeLessThanOrEqual(2);
    }
  });
  it("stretch percentage serves one level above skill roughly that often", () => {
    const c = ctx({ randomDifficultyPct: 20, rating: 1600 });
    const cands = bank(400);
    let above = 0;
    for (let i = 0; i < 1000; i++) {
      const q = nextQuestion(cands, c)!;
      if (q.difficulty === 3) above++;
      expect(q.difficulty).toBeLessThanOrEqual(3);
    }
    expect(above / 1000).toBeGreaterThan(0.13);
    expect(above / 1000).toBeLessThan(0.27);
  });
  it("interleaves within a pair", () => {
    const c = ctx({ pair: "weaken_flaw", randomDifficultyPct: 0 });
    const cands = bank(200);
    let last: string | null = null;
    let repeats = 0;
    for (let i = 0; i < 50; i++) {
      const q: Candidate = nextQuestion(cands, { ...c, lastType: last })!;
      expect(["weaken", "flaw"]).toContain(q.type);
      if (q.type === last) repeats++;
      last = q.type;
    }
    expect(repeats).toBe(0);
  });
  it("never serves the reserved timed pool", () => {
    const cands = bank(100);
    for (let i = 0; i < 300; i++) {
      const q = nextQuestion(cands, ctx({ levels: [1, 2, 3, 4] }))!;
      expect(q.reservedForTimed).toBe(false);
    }
  });
  it("skips recently seen items unless repeat is on, then falls back rather than stalling", () => {
    const cands = bank(8).map((c) => ({ ...c, lastSeenAt: "2026-10-30T00:00:00Z" }));
    const q = nextQuestion(cands, ctx({ levels: [1, 2, 3, 4], repeat: false }));
    expect(q).not.toBeNull(); // fallback allowed repeats
    const fresh = [...cands, { ...cands[0], id: "fresh", lastSeenAt: null }];
    for (let i = 0; i < 20; i++) expect(nextQuestion(fresh, ctx({ levels: [1, 2, 3, 4], repeat: false }))!.id).toBe("fresh");
  });
  it("prioritizes due and inbox items over fresh bank items", () => {
    const cands: Candidate[] = [...bank(50), { ...bank(1)[0], id: "due1", source: "due", difficulty: 4 }];
    expect(nextQuestion(cands, ctx({ randomDifficultyPct: 0 }))!.id).toBe("due1");
  });
  it("filters by tag", () => {
    const cands = bank(100);
    for (let i = 0; i < 50; i++) {
      const q = nextQuestion(cands, ctx({ tags: ["causation"], levels: [1, 2, 3, 4] }))!;
      expect(q.logicTags).toContain("causation");
    }
  });
});

describe("nextQuestion widening", () => {
  it("widens the difficulty band when the in-band pool is exhausted instead of returning null", () => {
    const cands: Candidate[] = [1, 2, 3, 4].map((d) => ({ id: `w${d}`, section: "LR", type: "flaw", logicTags: [], difficulty: d as Difficulty, source: "bank", reservedForTimed: false, lastSeenAt: null, timesSeen: 0 }));
    const c = ctx({ rating: 1200, randomDifficultyPct: 0 }); // skill level 1
    const served: string[] = [];
    for (let i = 0; i < 4; i++) {
      const q = nextQuestion(cands, { ...c, excludeIds: served });
      expect(q).not.toBeNull();
      served.push(q!.id);
    }
    expect(served.sort()).toEqual(["w1", "w2", "w3", "w4"]);
    expect(nextQuestion(cands, { ...c, excludeIds: served })).toBeNull();
  });
});
