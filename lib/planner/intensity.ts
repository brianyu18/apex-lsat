/**
 * Intensity: how many hours a week the gap between where you are and where
 * you want to be requires, given the weeks available.
 *
 * Working model (the program's assumptions, stated so they can be tuned from
 * your own data later): a point of scaled score costs more hours the higher
 * you are — about 10 h/point below 160, 14 h/point in the 160s, 20 h/point at
 * 170+. Foundations add a fixed ~40 h when there's no diagnostic above 160.
 * A maintenance floor of 6 h/week keeps skills from decaying even when the
 * gap is already closed.
 */
import { differenceInCalendarDays, parseISO } from "date-fns";

export type IntensityLabel = "relaxed" | "standard" | "aggressive" | "unrealistic";

export function hoursPerPoint(score: number): number {
  return score < 160 ? 10 : score < 170 ? 14 : 20;
}

/** Total study hours the model expects from `from` to `goal`. */
export function hoursNeeded(from: number | null, goal: number): number {
  const start = from ?? 150; // no diagnostic → assume a cold start
  let h = from == null || from < 160 ? 40 : 0;
  for (let s = start; s < goal; s++) h += hoursPerPoint(s);
  return h;
}

export function labelFor(hoursPerWeek: number): IntensityLabel {
  if (hoursPerWeek <= 8) return "relaxed";
  if (hoursPerWeek <= 15) return "standard";
  if (hoursPerWeek <= 25) return "aggressive";
  return "unrealistic";
}

export interface IntensityPlan {
  weeks: number;
  hoursNeeded: number;
  hoursPerWeek: number; // recommended
  label: IntensityLabel;
  feasible: boolean; // ≤ 25 h/week
  /** with the hours the student actually set, how many points the model expects by test day */
  expectedGainAtCurrentHours: number | null;
}

export function intensityFor(opts: { from: number | null; goal: number; today: string; testDate: string; currentHoursPerWeek?: number | null }): IntensityPlan {
  const days = Math.max(1, differenceInCalendarDays(parseISO(opts.testDate), parseISO(opts.today)) - 7); // final week is protect, not gain
  const weeks = Math.max(0.5, days / 7);
  const need = hoursNeeded(opts.from, opts.goal);
  const perWeek = Math.max(6, Math.round((need / weeks) * 2) / 2);
  let expected: number | null = null;
  if (opts.currentHoursPerWeek) {
    let budget = opts.currentHoursPerWeek * weeks - (opts.from == null || opts.from < 160 ? 40 : 0);
    let s = opts.from ?? 150;
    while (budget >= hoursPerPoint(s) && s < 180) {
      budget -= hoursPerPoint(s);
      s++;
    }
    expected = Math.max(0, s - (opts.from ?? 150));
  }
  return { weeks: Math.round(weeks * 10) / 10, hoursNeeded: need, hoursPerWeek: perWeek, label: labelFor(perWeek), feasible: perWeek <= 25, expectedGainAtCurrentHours: expected };
}

export const INTENSITY_COPY: Record<IntensityLabel, string> = {
  relaxed: "Comfortable pace — room for life. Keep every PT day anyway.",
  standard: "A normal serious prep load: an hour or two most days plus a long PT day.",
  aggressive: "Doable if you protect the hours; expect fatigue in the mixed phase. Sleep is part of the plan.",
  unrealistic: "More than 25 h/week sustained rarely converts to points. Pick a later date or a nearer goal.",
};
