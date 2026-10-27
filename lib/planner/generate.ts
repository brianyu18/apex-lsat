/**
 * Date-agnostic study plan generator.
 *
 * Input: start date, test date (or undecided), hours/week, days/week, optional
 * diagnostic. Output: phases with date ranges and a block list for every study
 * day up to the test date.
 *
 * Phase shares of total weeks (defaults):
 *   foundations 12% (min 1 wk, 5% if diagnostic ≥ 165)
 *   lr          30%
 *   rc          18%
 *   mixed       32%  (mixed timed sections + weekly PT)
 *   protect      8%  (min 1 wk; final week protects the score)
 *
 * Undecided test date → assume 24 weeks, mark the plan provisional.
 */
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

export type Phase = "foundations" | "lr" | "rc" | "mixed" | "protect";
export const PHASES: Phase[] = ["foundations", "lr", "rc", "mixed", "protect"];
export const PHASE_LABELS: Record<Phase, string> = {
  foundations: "Foundations",
  lr: "Logical Reasoning",
  rc: "Reading Comprehension",
  mixed: "Mixed timed practice",
  protect: "Final week — protect the score",
};

export interface PlanInput {
  startDate: string; // YYYY-MM-DD
  testDate: string | null; // YYYY-MM-DD or null = undecided
  hoursPerWeek: number;
  daysPerWeek: number; // 1–7
  diagnosticScaled?: number | null;
  /** which weekday indexes (0=Sun) are rest days; derived from daysPerWeek if omitted */
  restDays?: number[];
}

export interface PlanPhase {
  phase: Phase;
  start: string;
  end: string; // inclusive
  weeks: number;
}

export interface PlanBlock {
  kind: "lesson" | "drill" | "review" | "timed_section" | "pt" | "br" | "rest" | "light";
  minutes: number;
  label: string;
  ref?: string;
}

export interface PlanDay {
  day: string;
  phase: Phase;
  blocks: PlanBlock[];
  minutes: number;
}

export interface GeneratedPlan {
  testDate: string;
  provisional: boolean;
  totalWeeks: number;
  phases: PlanPhase[];
  days: PlanDay[];
  totalMinutes: number;
}

export const DEFAULT_UNDECIDED_WEEKS = 24;

const SHARES: Record<Phase, number> = { foundations: 0.12, lr: 0.3, rc: 0.18, mixed: 0.32, protect: 0.08 };

export function defaultRestDays(daysPerWeek: number): number[] {
  const d = Math.max(1, Math.min(7, Math.round(daysPerWeek)));
  // drop days in this order as the week shrinks: Sat, Sun, Wed, Fri, Mon, Tue (Thu last)
  const dropOrder = [6, 0, 3, 5, 1, 2, 4];
  return dropOrder.slice(0, 7 - d);
}

export function generatePlan(input: PlanInput): GeneratedPlan {
  const start = startOfDay(parseISO(input.startDate));
  const provisional = !input.testDate;
  const testDate = input.testDate ? startOfDay(parseISO(input.testDate)) : addDays(start, DEFAULT_UNDECIDED_WEEKS * 7);
  const totalDays = Math.max(7, differenceInCalendarDays(testDate, start)); // days of prep before test day
  const totalWeeks = totalDays / 7;

  // Phase lengths in days
  const shares = { ...SHARES };
  if ((input.diagnosticScaled ?? 0) >= 165) {
    shares.foundations = 0.05;
    shares.lr += 0.04;
    shares.mixed += 0.03;
  }
  let lengths: Record<Phase, number> = {
    foundations: Math.max(7, Math.round(totalDays * shares.foundations)),
    lr: Math.round(totalDays * shares.lr),
    rc: Math.round(totalDays * shares.rc),
    mixed: Math.round(totalDays * shares.mixed),
    protect: Math.max(7, Math.round(totalDays * shares.protect)),
  };
  // Very short plans: compress to fit while keeping protect ≥ 7 days.
  let sum = PHASES.reduce((s, p) => s + lengths[p], 0);
  if (sum > totalDays) {
    const flex: Phase[] = ["foundations", "lr", "rc", "mixed"];
    const flexTotal = flex.reduce((s, p) => s + lengths[p], 0);
    const available = Math.max(0, totalDays - lengths.protect);
    const scaled = Object.fromEntries(flex.map((p) => [p, Math.floor((lengths[p] / flexTotal) * available)])) as Record<Phase, number>;
    lengths = { ...lengths, ...scaled };
    sum = PHASES.reduce((s, p) => s + lengths[p], 0);
  }
  // Give any rounding remainder to mixed.
  lengths.mixed += totalDays - sum;

  const phases: PlanPhase[] = [];
  let cursor = start;
  for (const p of PHASES) {
    if (lengths[p] <= 0) continue;
    const end = addDays(cursor, lengths[p] - 1);
    phases.push({ phase: p, start: fmt(cursor), end: fmt(end), weeks: Math.round((lengths[p] / 7) * 10) / 10 });
    cursor = addDays(end, 1);
  }

  const rest = new Set(input.restDays ?? defaultRestDays(input.daysPerWeek));
  const studyDaysPerWeek = 7 - rest.size;
  const minutesPerStudyDay = Math.round((input.hoursPerWeek * 60) / Math.max(1, studyDaysPerWeek));

  const days: PlanDay[] = [];
  let weekdayCounter = 0; // counts study days to place weekly PTs
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(start, i);
    const phase = phases.find((p) => fmt(d) >= p.start && fmt(d) <= p.end)?.phase ?? "mixed";
    if (rest.has(d.getDay())) {
      days.push({ day: fmt(d), phase, blocks: [{ kind: "rest", minutes: 0, label: "Rest" }], minutes: 0 });
      continue;
    }
    weekdayCounter++;
    const blocks = blocksFor(phase, minutesPerStudyDay, weekdayCounter, studyDaysPerWeek, i === totalDays - 1);
    days.push({ day: fmt(d), phase, blocks, minutes: blocks.reduce((s, b) => s + b.minutes, 0) });
  }

  return {
    testDate: fmt(testDate),
    provisional,
    totalWeeks: Math.round(totalWeeks * 10) / 10,
    phases,
    days,
    totalMinutes: days.reduce((s, d) => s + d.minutes, 0),
  };
}

function blocksFor(phase: Phase, minutes: number, studyDayIndex: number, studyDaysPerWeek: number, dayBeforeTest: boolean): PlanBlock[] {
  const m = minutes;
  const isPtDay = studyDaysPerWeek > 0 && studyDayIndex % studyDaysPerWeek === 0; // last study day of each week
  if (phase === "protect") {
    if (dayBeforeTest) return [{ kind: "rest", minutes: 0, label: "No LSAT today — sleep, pack, light walk" }];
    return [
      { kind: "light", minutes: Math.round(m * 0.4), label: "Light drill — levels 1–2, accuracy only" },
      { kind: "review", minutes: Math.round(m * 0.3), label: "Reread your error journal takeaways" },
      { kind: "light", minutes: Math.round(m * 0.3), label: "One timed section at test time of day" },
    ];
  }
  switch (phase) {
    case "foundations":
      return [
        { kind: "lesson", minutes: Math.round(m * 0.5), label: "Foundations lesson + check" },
        { kind: "drill", minutes: Math.round(m * 0.35), label: "Untimed drill — lesson tags" },
        { kind: "review", minutes: Math.round(m * 0.15), label: "Review inbox" },
      ];
    case "lr":
      return isPtDay && m >= 60
        ? [
            { kind: "timed_section", minutes: 35, label: "Timed LR section" },
            { kind: "br", minutes: Math.max(15, m - 35), label: "Blind review + error tagging" },
          ]
        : [
            { kind: "lesson", minutes: Math.round(m * 0.35), label: "LR type lesson + check" },
            { kind: "drill", minutes: Math.round(m * 0.45), label: "Untimed drill — current pair" },
            { kind: "review", minutes: Math.round(m * 0.2), label: "Review inbox + due re-drills" },
          ];
    case "rc":
      return isPtDay && m >= 60
        ? [
            { kind: "timed_section", minutes: 35, label: "Timed RC section" },
            { kind: "br", minutes: Math.max(15, m - 35), label: "Blind review + passage map check" },
          ]
        : [
            { kind: "lesson", minutes: Math.round(m * 0.3), label: "RC lesson + passage map" },
            { kind: "drill", minutes: Math.round(m * 0.5), label: "Passage drill — untimed, prediction mode" },
            { kind: "review", minutes: Math.round(m * 0.2), label: "Review inbox + LR maintenance" },
          ];
    case "mixed":
    default:
      return isPtDay
        ? [
            { kind: "pt", minutes: 150, label: "Full practice test (4 sections + break)" },
            { kind: "br", minutes: Math.max(30, m - 150), label: "Blind review + error tagging" },
          ]
        : [
            { kind: "timed_section", minutes: 35, label: "Timed section (LR/RC alternating)" },
            { kind: "br", minutes: Math.round(Math.max(0, m - 35) * 0.5), label: "Blind review + error tagging" },
            { kind: "drill", minutes: Math.round(Math.max(0, m - 35) * 0.5), label: "Due re-drills + bottleneck focus" },
          ];
  }
}

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}
