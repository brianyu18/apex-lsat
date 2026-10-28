import { describe, expect, it } from "vitest";
import { qualityBand, studyQuality } from "@/lib/scoring/quality";

const perfect = {
  windowDays: 30,
  counted: 400,
  correct: 360,
  daysStudied: 26,
  daysPerWeekGoal: 5,
  missesInWindow: 40,
  missesReviewed: 40,
  studyMinutes: 10 * 60 * (30 / 7),
  hoursPerWeekGoal: 10,
  activityKinds: ["lesson", "drill", "review", "section", "pt", "rc", "writing"],
};

describe("study quality", () => {
  it("perfect month scores 100", () => {
    const q = studyQuality(perfect);
    expect(q.total).toBe(100);
    expect(q.parts.map((p) => p.max)).toEqual([28, 27, 26, 10, 9]);
    expect(qualityBand(q.total).label).toBe("Excellent");
  });
  it("each component degrades independently", () => {
    expect(studyQuality({ ...perfect, correct: 200 }).parts[0].points).toBe(0); // 50%
    expect(studyQuality({ ...perfect, correct: 270 }).parts[0].points).toBe(14); // 67.5% → half
    expect(studyQuality({ ...perfect, daysStudied: 11 }).parts[1].points).toBe(14);
    expect(studyQuality({ ...perfect, missesReviewed: 10 }).parts[2].points).toBe(7);
    expect(studyQuality({ ...perfect, studyMinutes: 0 }).parts[3].points).toBe(0);
    expect(studyQuality({ ...perfect, activityKinds: ["drill"] }).parts[4].points).toBe(2);
  });
  it("small samples cap the accuracy component", () => {
    expect(studyQuality({ ...perfect, counted: 10, correct: 10 }).parts[0].points).toBe(7);
  });
  it("empty month is near zero", () => {
    const q = studyQuality({ ...perfect, counted: 0, correct: 0, daysStudied: 0, missesInWindow: 0, missesReviewed: 0, studyMinutes: 0, activityKinds: [] });
    expect(q.total).toBe(0);
  });
});
