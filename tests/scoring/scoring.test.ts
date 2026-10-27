import { describe, expect, it } from "vitest";
import { percentile, rawToScaled, scaledToRaw } from "@/lib/scoring/tables";
import { interpretBrGap, marginOfError, scoreRange } from "@/lib/scoring/range";

describe("rawToScaled", () => {
  it("maps the published anchors within ±1", () => {
    expect(Math.abs(rawToScaled(69) - 170)).toBeLessThanOrEqual(1); // −8
    expect(Math.abs(rawToScaled(73) - 175)).toBeLessThanOrEqual(1); // −4
    expect(Math.abs(rawToScaled(74) - 177)).toBeLessThanOrEqual(1); // −3
    expect(rawToScaled(77)).toBe(180);
    expect(rawToScaled(76)).toBeGreaterThanOrEqual(179);
    expect(rawToScaled(0)).toBe(120);
  });
  it("scales for other form lengths", () => {
    expect(Math.abs(rawToScaled(67, 75) - 170)).toBeLessThanOrEqual(1);
  });
  it("round-trips approximately", () => {
    for (const s of [150, 160, 165, 170, 173, 175, 177]) {
      const raw = scaledToRaw(s);
      expect(Math.abs(rawToScaled(raw) - s)).toBeLessThanOrEqual(1);
    }
  });
});

describe("percentile", () => {
  it("matches LSAC's table at key scores", () => {
    expect(percentile(170)).toBe(94.5);
    expect(percentile(175)).toBe(98.7);
    expect(percentile(160)).toBe(71.1);
    expect(percentile(180)).toBe(99.85);
  });
});

describe("scoreRange", () => {
  it("has ±4 after one test and ~±1.6 after five", () => {
    expect(marginOfError(1)).toBe(4);
    expect(marginOfError(5)).toBeCloseTo(1.6, 5);
    const one = scoreRange([{ scaled: 168, finishedAt: "2026-11-01" }]);
    expect(one.low).toBe(164);
    expect(one.high).toBe(172);
    const five = scoreRange(
      [170, 172, 171, 173, 174].map((s, i) => ({ scaled: s, brScaled: s + 3, finishedAt: `2026-11-0${i + 1}` })),
    );
    expect(five.n).toBe(5);
    expect(five.mean).toBe(172);
    expect(five.moe).toBe(1.6);
    expect(five.brGap).toBe(3);
  });
  it("uses only the five most recent tests", () => {
    const r = scoreRange(
      [150, 150, 170, 170, 170, 170, 170].map((s, i) => ({ scaled: s, finishedAt: `2026-11-${String(i + 1).padStart(2, "0")}` })),
    );
    expect(r.mean).toBe(170);
  });
  it("interprets gaps", () => {
    expect(interpretBrGap(10).label).toMatch(/Large/);
    expect(interpretBrGap(0).label).toMatch(/content/i);
  });
});
