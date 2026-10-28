/**
 * Re-planning (v2): keep days already completed (or in the past), regenerate
 * the rest with the new inputs, and — when the data says a phase hasn't done
 * its job — extend that phase by a week before moving on.
 *
 * Exit criteria (evaluated by the caller, passed in as signals):
 *   foundations → ≥ 80% of Unit 0–1 lesson checks passed
 *   lr          → ≥ 75% of LR types with ≥ 10 counted attempts rated at level-3 band or higher
 *   rc          → RC section rating at level-3 band with ≥ 30 counted attempts
 * A phase is extended at most one week per re-plan, only when today is inside
 * its final week (or past its end), and only when the criterion is known false.
 */
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { generatePlan, type GeneratedPlan, type Phase, type PlanDay, type PlanInput } from "./generate";

export interface PhaseSignals {
  foundationsPassed?: boolean | null;
  lrReady?: boolean | null;
  rcReady?: boolean | null;
}

export interface ReplanOptions {
  today?: string; // YYYY-MM-DD
  completedDays: PlanDay[]; // days to preserve verbatim (completed or in the past)
  signals?: PhaseSignals;
  /** original plan start; defaults to the earliest preserved day, else today */
  startDate?: string;
  /** days already granted to phases by earlier re-plans (carried on the stored plan) */
  priorExtraDays?: Partial<Record<Phase, number>>;
}

export interface ReplanResult extends GeneratedPlan {
  extended: Phase | null;
  extraDays: Partial<Record<Phase, number>>;
}

const CRITERION: Partial<Record<Phase, keyof PhaseSignals>> = { foundations: "foundationsPassed", lr: "lrReady", rc: "rcReady" };

/** Which phase (if any) should get another week, given where today falls in the base schedule. */
export function decideExtension(base: GeneratedPlan, today: string, signals: PhaseSignals = {}): Phase | null {
  for (const ph of base.phases) {
    const key = CRITERION[ph.phase];
    if (!key) continue;
    const met = signals[key];
    if (met !== false) continue; // unknown or met → no extension
    const inFinalWeek = today >= format(addDays(parseISO(ph.end), -6), "yyyy-MM-dd") && today <= ph.end;
    const justEnded = today > ph.end && differenceInCalendarDays(parseISO(today), parseISO(ph.end)) <= 7;
    if (inFinalWeek || justEnded) return ph.phase;
  }
  return null;
}

export function replan(input: Omit<PlanInput, "startDate">, opts: ReplanOptions): ReplanResult {
  const today = opts.today ?? format(new Date(), "yyyy-MM-dd");
  const preserved = opts.completedDays.filter((d) => d.day < today).sort((a, b) => a.day.localeCompare(b.day));
  const startDate = opts.startDate ?? preserved[0]?.day ?? today;
  const prior = { ...(opts.priorExtraDays ?? {}) };
  const base = generatePlan({ ...input, startDate, extraDays: prior });
  const extended = decideExtension(base, today, opts.signals);
  const extraDays = { ...prior };
  if (extended) extraDays[extended] = (extraDays[extended] ?? 0) + 7;
  const fresh = extended ? generatePlan({ ...input, startDate, extraDays }) : base;
  const days = [...preserved, ...fresh.days.filter((d) => d.day >= today)];
  return {
    ...fresh,
    days,
    totalMinutes: days.reduce((s, d) => s + d.minutes, 0),
    extended,
    extraDays,
  };
}

/** Registration advice from the score range. */
export function registrationAdvice(range: { n: number; low: number | null; high: number | null; mean: number | null }, goal: number, testDate: string | null, today = format(new Date(), "yyyy-MM-dd")) {
  if (range.n < 2 || range.low == null || range.mean == null) return { verdict: "wait" as const, reason: "Need at least two full-length tests for a range before deciding." };
  const daysLeft = testDate ? differenceInCalendarDays(parseISO(testDate), parseISO(today)) : null;
  if (range.low >= goal - 2) {
    return testDate
      ? { verdict: "register" as const, reason: `Range floor ${range.low} is within 2 of your goal ${goal}. Keep the date${daysLeft != null ? ` (${daysLeft} days)` : ""} and protect the score.` }
      : { verdict: "register" as const, reason: `Range floor ${range.low} is within 2 of your goal ${goal}. Pick the next administration and register.` };
  }
  if (range.high != null && range.high >= goal) {
    return { verdict: "keep" as const, reason: `Goal ${goal} is inside the range (${range.low}–${range.high}) but the floor isn't there yet. Keep working; decide at the two-week mark.` };
  }
  const gap = Math.round(goal - range.mean);
  return testDate && daysLeft != null && daysLeft < 21 && gap >= 4
    ? { verdict: "postpone" as const, reason: `Mean ${range.mean} is ${gap} below goal with ${daysLeft} days left; a point a week is the realistic ceiling. Postpone to the next date.` }
    : { verdict: "keep" as const, reason: `Mean ${range.mean} is ${gap} below goal. Keep the date for now; the gap usually closes one point per two weeks of mixed practice.` };
}
