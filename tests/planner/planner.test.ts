import { describe, expect, it } from "vitest";
import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";
import { DEFAULT_UNDECIDED_WEEKS, defaultRestDays, generatePlan, PHASES } from "@/lib/planner/generate";
import { registrationAdvice, replan } from "@/lib/planner/replan";

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

describe("planner v2 — exit criteria", () => {
  const input = { testDate: "2027-04-08", hoursPerWeek: 12, daysPerWeek: 6 };
  it("unmet LR criteria at phase end → LR extended 1 week, later phases compressed, final week preserved", () => {
    const base = generatePlan({ ...input, startDate: START });
    const lr = base.phases.find((p) => p.phase === "lr")!;
    const today = lr.end; // last day of LR
    const done = base.days.filter((d) => d.day < today);
    const next = replan(input, { today, completedDays: done, startDate: START, signals: { lrReady: false } });
    expect(next.extended).toBe("lr");
    expect(next.extraDays).toEqual({ lr: 7 });
    const lr2 = next.phases.find((p) => p.phase === "lr")!;
    expect(differenceInCalendarDays(parseISO(lr2.end), parseISO(lr.end))).toBe(7);
    // date fixed → same test date, protect still ≥ 7 days and same length
    expect(next.testDate).toBe("2027-04-08");
    const prot = next.phases.find((p) => p.phase === "protect")!;
    const prot0 = base.phases.find((p) => p.phase === "protect")!;
    expect(differenceInCalendarDays(parseISO(prot.end), parseISO(prot.start))).toBe(differenceInCalendarDays(parseISO(prot0.end), parseISO(prot0.start)));
    // later flex phases gave the week back
    const later = (p: typeof base) => p.phases.filter((x) => x.phase === "rc" || x.phase === "mixed").reduce((a, x) => a + differenceInCalendarDays(parseISO(x.end), parseISO(x.start)) + 1, 0);
    expect(later(base) - later(next)).toBe(7);
    // completed days untouched, every day still present once
    expect(next.days.filter((d) => d.day < today)).toEqual(done);
    expect(new Set(next.days.map((d) => d.day)).size).toBe(next.days.length);
  });
  it("met or unknown criteria → no extension; mid-phase → no extension", () => {
    const base = generatePlan({ ...input, startDate: START });
    const lr = base.phases.find((p) => p.phase === "lr")!;
    expect(replan(input, { today: lr.end, completedDays: [], startDate: START, signals: { lrReady: true } }).extended).toBeNull();
    expect(replan(input, { today: lr.end, completedDays: [], startDate: START, signals: {} }).extended).toBeNull();
    expect(replan(input, { today: lr.start, completedDays: [], startDate: START, signals: { lrReady: false } }).extended).toBeNull();
  });
  it("undecided date → extension lengthens the plan instead of compressing", () => {
    const und = { testDate: null, hoursPerWeek: 12, daysPerWeek: 6 };
    const base = generatePlan({ ...und, startDate: START });
    const f = base.phases.find((p) => p.phase === "foundations")!;
    const next = replan(und, { today: f.end, completedDays: [], startDate: START, signals: { foundationsPassed: false } });
    expect(next.extended).toBe("foundations");
    expect(differenceInCalendarDays(parseISO(next.testDate), parseISO(base.testDate))).toBe(7);
  });
  it("prior extensions carry forward", () => {
    const next = replan(input, { today: "2026-12-01", completedDays: [], startDate: START, priorExtraDays: { lr: 7 }, signals: {} });
    expect(next.extraDays).toEqual({ lr: 7 });
  });
});

describe("registrationAdvice", () => {
  it("floor within 2 of goal → register", () => {
    expect(registrationAdvice({ n: 3, low: 173, high: 177, mean: 175 }, 175, null).verdict).toBe("register");
  });
  it("too few tests → wait; goal inside range → keep; far below with little time → postpone", () => {
    expect(registrationAdvice({ n: 1, low: 160, high: 168, mean: 164 }, 175, null).verdict).toBe("wait");
    expect(registrationAdvice({ n: 3, low: 170, high: 176, mean: 173 }, 175, "2027-04-08", "2026-12-01").verdict).toBe("keep");
    expect(registrationAdvice({ n: 3, low: 160, high: 166, mean: 163 }, 175, "2026-12-10", "2026-12-01").verdict).toBe("postpone");
  });
});
