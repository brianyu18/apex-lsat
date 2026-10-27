import { describe, expect, it } from "vitest";
import { assembleSection, difficultyCurve, scoreBlindReview, typeQuota, type SectionCandidate } from "@/lib/engine/section";
import { lrTargetCumulative, pacingCurve, timeBleeds } from "@/lib/engine/pacing";
import { LR_TYPES, type Difficulty } from "@/lib/content/taxonomy";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pool(n: number): SectionCandidate[] {
  const out: SectionCandidate[] = [];
  let i = 0;
  while (out.length < n) {
    for (const t of LR_TYPES) {
      if (out.length >= n) break;
      out.push({ id: `${t}-${i}`, type: t, difficulty: ((i % 4) + 1) as Difficulty, reservedForTimed: i % 2 === 0, lastSeenAt: null, timesSeen: 0 });
    }
    i++;
  }
  return out;
}

describe("typeQuota", () => {
  it("sums to n and tracks frequency", () => {
    const q = typeQuota(25);
    expect(Object.values(q).reduce((a, b) => a + b, 0)).toBe(25);
    expect(q.flaw).toBeGreaterThanOrEqual(3);
    expect(q.most_strongly_supported).toBeGreaterThanOrEqual(2);
  });
});

describe("assembleSection", () => {
  it("builds a 25-question section with a difficulty curve and no repeats", () => {
    const s = assembleSection(pool(400), { n: 25, rng: mulberry32(3) })!;
    expect(s).toHaveLength(25);
    expect(new Set(s.map((c) => c.id)).size).toBe(25);
    const first5 = s.slice(0, 5).reduce((a, c) => a + c.difficulty, 0) / 5;
    const hard = s.slice(15, 21).reduce((a, c) => a + c.difficulty, 0) / 6;
    expect(first5).toBeLessThan(hard);
    expect(difficultyCurve(25)[0]).toBe(1);
  });
  it("returns null when the pool is too small", () => {
    expect(assembleSection(pool(10), { n: 25 })).toBeNull();
  });
  it("prefers the reserved pool when asked and available", () => {
    const s = assembleSection(pool(400), { n: 25, preferReserved: true, rng: mulberry32(4) })!;
    expect(s.every((c) => c.reservedForTimed)).toBe(true);
  });
});

describe("scoreBlindReview", () => {
  it("computes timed, BR, gap and outcome classes", () => {
    const r = scoreBlindReview([
      { questionId: "1", key: "A", timedAnswer: "A", flagged: false, brAnswer: null }, // right_right
      { questionId: "2", key: "B", timedAnswer: "C", flagged: true, brAnswer: "B" }, // wrong_right (recovered)
      { questionId: "3", key: "C", timedAnswer: "D", flagged: true, brAnswer: "E" }, // wrong_wrong (stuck)
      { questionId: "4", key: "D", timedAnswer: "A", flagged: false, brAnswer: null }, // unreviewed_miss (blind spot)
      { questionId: "5", key: "E", timedAnswer: null, flagged: false, brAnswer: "E" }, // blank_right
      { questionId: "6", key: "A", timedAnswer: "A", flagged: true, brAnswer: "B" }, // right_wrong
    ]);
    expect(r.timedRaw).toBe(2);
    expect(r.brRaw).toBe(3);
    expect(r.gap).toBe(1);
    expect(r.recovered).toBe(2);
    expect(r.stuck).toBe(1);
    expect(r.blindSpots).toBe(1);
    expect(r.items.map((i) => i.outcome)).toEqual(["right_right", "wrong_right", "wrong_wrong", "unreviewed_miss", "blank_right", "right_wrong"]);
  });
});

describe("pacing", () => {
  it("target curve hits roughly the published checkpoints", () => {
    const n = 25;
    expect(lrTargetCumulative(9, n) / 60).toBeGreaterThan(8);
    expect(lrTargetCumulative(9, n) / 60).toBeLessThan(11);
    expect(lrTargetCumulative(24, n) / 60).toBeLessThan(34);
  });
  it("flags time bleeds and computes deltas", () => {
    const secs = Array(25).fill(70);
    secs[12] = 240;
    expect(timeBleeds(secs)).toEqual([12]);
    const curve = pacingCurve(secs);
    expect(curve[24].cumulativeSec).toBe(70 * 24 + 240);
    expect(curve[12].deltaSec).toBeGreaterThan(curve[11].deltaSec);
  });
});
