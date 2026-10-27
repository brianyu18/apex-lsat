/**
 * Re-planning: keep days already completed (or in the past), regenerate the
 * rest from today with the new inputs. Phase 4 extends this with data-driven
 * phase extension.
 */
import { format } from "date-fns";
import { generatePlan, type GeneratedPlan, type PlanDay, type PlanInput } from "./generate";

export interface ReplanOptions {
  today?: string; // YYYY-MM-DD
  completedDays: PlanDay[]; // days to preserve verbatim (completed or in the past)
}

export function replan(input: Omit<PlanInput, "startDate">, opts: ReplanOptions): GeneratedPlan {
  const today = opts.today ?? format(new Date(), "yyyy-MM-dd");
  const preserved = opts.completedDays.filter((d) => d.day < today).sort((a, b) => a.day.localeCompare(b.day));
  const fresh = generatePlan({ ...input, startDate: today });
  const days = [...preserved, ...fresh.days.filter((d) => d.day >= today)];
  return {
    ...fresh,
    days,
    totalMinutes: days.reduce((s, d) => s + d.minutes, 0),
  };
}
