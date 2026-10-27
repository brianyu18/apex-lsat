import { describe, expect, it } from "vitest";
import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";
import { DEFAULT_UNDECIDED_WEEKS, defaultRestDays, generatePlan, PHASES } from "@/lib/planner/generate";
import { replan } from "@/lib/planner/replan";

const START = "2026-10-27";
const HOURS = 12;
const DAYS = 6;

function check(testDate: string | null) {
  const plan = generatePlan({ startDate: START, testDate, hoursPerWeek: HOURS, daysPerWeek: DAYS, diagnosticScaled: 158 });
  const expectedTest = testDate ?? format(addDays(parseISO(START), DEFAULT_UNDECIDED_WEEKS * 7), "yyyy-MM-dd");
  expect(plan.testDate).toBe(expectedTest);
  expect(plan.provisional).toBe(testDate == null);

  // phases are contiguous, in order, and cover every day up to the day before the test
  expect(plan.phases.map((p) => p.phase)).toEqual(PHASES.filter((p) => plan.phases.some((x) => x.phase === p)));
  expect(plan.phases[0].start).toBe(START);
  for (let i = 1; i < plan.phases.length; i++) {
    expect(plan.phases[i].start).toBe(format(addDays(parseISO(plan.phases[i - 1].end), 1), "yyyy-MM-dd"));
  }
  const last = plan.phases[plan.phases.length - 1];
  expect(last.phase).toBe("protect");
  expect(format(addDays(parseISO(last.end), 1), "yyyy-MM-dd")).toBe(expectedTest);
  expect(differenceInCalendarDays(parseISO(last.end), parseISO(last.start)) + 1).toBeGreaterThanOrEqual(7);

  // one entry per day
  const totalDays = differenceInCalendarDays(parseISO(expectedTest), parseISO(START));
  expect(plan.days.length).toBe(totalDays);

  // hours ≈ weeks × hours/week (±8%; PT weeks and the protect week pull it around)
  const weeks = totalDays / 7;
  const hours = plan.totalMinutes / 60;
  expect(hours).toBeGreaterThan(weeks * HOURS * 0.85);
  expect(hours).toBeLessThan(weeks * HOURS * 1.15);

  // day before the test has no study
  expect(plan.days[plan.days.length - 1].minutes).toBe(0);
  return plan;
}

describe("generatePlan", () => {
  it("January 13 2027 (short, ~11 weeks)", () => {
    const p = check("2027-01-13");
    expect(p.totalWeeks).toBeCloseTo(11.1, 0);
  });
  it("April 8 2027", () => {
    check("2027-04-08");
  });
  it("June 9 2027", () => {
    const p = check("2027-06-09");
    expect(p.phases.find((x) => x.phase === "mixed")!.weeks).toBeGreaterThan(8);
  });
  it("undecided → 24-week provisional plan", () => {
    const p = check(null);
    expect(p.totalWeeks).toBe(24);
  });
  it("high diagnostic shortens foundations", () => {
    const lo = generatePlan({ startDate: START, testDate: "2027-04-08", hoursPerWeek: 10, daysPerWeek: 6, diagnosticScaled: 155 });
    const hi = generatePlan({ startDate: START, testDate: "2027-04-08", hoursPerWeek: 10, daysPerWeek: 6, diagnosticScaled: 168 });
    expect(hi.phases[0].weeks).toBeLessThan(lo.phases[0].weeks);
  });
  it("rest days follow days/week", () => {
    expect(defaultRestDays(6)).toEqual([6]);
    expect(defaultRestDays(5)).toEqual([6, 0]);
    const p = generatePlan({ startDate: START, testDate: "2027-04-08", hoursPerWeek: 10, daysPerWeek: 5 });
    const saturdays = p.days.filter((d) => parseISO(d.day).getDay() === 6);
    expect(saturdays.every((d) => d.minutes === 0)).toBe(true);
  });
  it("mixed phase schedules a weekly full PT", () => {
    const p = generatePlan({ startDate: START, testDate: "2027-06-09", hoursPerWeek: 12, daysPerWeek: 6 });
    const pts = p.days.filter((d) => d.phase === "mixed" && d.blocks.some((b) => b.kind === "pt"));
    const mixedWeeks = p.phases.find((x) => x.phase === "mixed")!.weeks;
    expect(pts.length).toBeGreaterThanOrEqual(Math.floor(mixedWeeks) - 1);
  });
});

describe("replan", () => {
  it("keeps completed days and regenerates the rest to a new date", () => {
    const original = generatePlan({ startDate: START, testDate: "2027-04-08", hoursPerWeek: 12, daysPerWeek: 6 });
    const today = "2026-11-10";
    const done = original.days.filter((d) => d.day < today).map((d) => ({ ...d, blocks: [{ kind: "lesson" as const, minutes: 1, label: "done" }], minutes: 1 }));
    const next = replan({ testDate: "2027-06-09", hoursPerWeek: 12, daysPerWeek: 6 }, { today, completedDays: done });
    expect(next.testDate).toBe("2027-06-09");
    expect(next.days.filter((d) => d.day < today).every((d) => d.minutes === 1)).toBe(true);
    expect(next.days[0].day).toBe(START);
    expect(next.days[next.days.length - 1].day).toBe("2027-06-08");
    expect(next.phases[next.phases.length - 1].phase).toBe("protect");
  });
});
