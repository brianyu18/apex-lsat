/**
 * Official PrepTest track.
 *
 * Takes the PrepTest numbers the student can access in LawHub and the plan's
 * full-test days, and assigns one official PT per PT day: oldest first, the
 * newest tests reserved for the final weeks, since the most recent tests best
 * resemble the one you'll sit. PT days with no official test left fall back to
 * a simulated test from the original bank. Nothing here ever touches LSAC
 * content — the student takes the test in LawHub and imports the result.
 */
import type { PlanDay } from "./generate";

export interface OfficialResult {
  pt: number;
  scaled: number | null;
  takenAt: string | Date;
}

export interface TrackEntry {
  day: string; // plan day
  pt: number | null; // null = simulated PT from the bank
  status: "taken" | "scheduled" | "simulated";
  scaled?: number | null;
}

export interface Track {
  entries: TrackEntry[];
  /** official PTs taken that weren't on a plan day (still count) */
  extra: OfficialResult[];
  remaining: number[]; // available and not yet taken, not yet scheduled
  availableCount: number;
  takenCount: number;
}

export const LAWHUB_URL = "https://app.lawhub.org";

/** Parse "150-158, 160" style input into a sorted unique list of PT numbers. */
export function parsePtList(input: string): number[] {
  const out = new Set<number>();
  for (const part of input.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
    } else if (/^\d+$/.test(part)) out.add(Number(part));
  }
  return Array.from(out).filter((n) => n >= 1 && n <= 999).sort((a, b) => a - b);
}

export function buildTrack(available: number[], planDays: PlanDay[], results: OfficialResult[], today: string): Track {
  const taken = new Map<number, OfficialResult>();
  for (const r of results) if (!taken.has(r.pt)) taken.set(r.pt, r);
  const ptDays = planDays.filter((d) => d.blocks.some((b) => b.kind === "pt")).map((d) => d.day).sort();
  const futureDays = ptDays.filter((d) => d >= today);
  const notTaken = available.filter((n) => !taken.has(n)).sort((a, b) => a - b);

  // Reserve the newest third (≥ 2, ≤ 6) for the final PT days; everything else oldest-first.
  const reserve = Math.min(6, Math.max(2, Math.floor(notTaken.length / 3)));
  const newest = notTaken.slice(Math.max(0, notTaken.length - reserve));
  const older = notTaken.slice(0, Math.max(0, notTaken.length - reserve));
  const schedule = new Map<string, number>();
  const finalDays = futureDays.slice(Math.max(0, futureDays.length - newest.length));
  const earlyDays = futureDays.slice(0, Math.max(0, futureDays.length - newest.length));
  earlyDays.forEach((d, i) => {
    if (older[i] != null) schedule.set(d, older[i]);
  });
  finalDays.forEach((d, i) => {
    if (newest[i] != null) schedule.set(d, newest[i]);
  });
  // If there are more early days than older tests, the leftover newest tests still land on the last days (handled above);
  // if fewer PT days than tests, the rest stay "remaining".
  const scheduled = new Set(schedule.values());

  // Past PT days: match taken tests to them by date (closest taken test within 3 days), otherwise simulated.
  const takenList = Array.from(taken.values()).sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
  const usedTaken = new Set<number>();
  const entries: TrackEntry[] = ptDays.map((day) => {
    if (day < today) {
      const t = takenList.find((r) => !usedTaken.has(r.pt) && Math.abs(new Date(r.takenAt).getTime() - new Date(`${day}T12:00:00`).getTime()) <= 3 * 86400_000);
      if (t) {
        usedTaken.add(t.pt);
        return { day, pt: t.pt, status: "taken", scaled: t.scaled };
      }
      return { day, pt: null, status: "simulated" };
    }
    const pt = schedule.get(day) ?? null;
    return { day, pt, status: pt == null ? "simulated" : "scheduled" };
  });
  const extra = takenList.filter((r) => !usedTaken.has(r.pt));
  const remaining = notTaken.filter((n) => !scheduled.has(n));
  return { entries, extra, remaining, availableCount: available.length, takenCount: taken.size };
}
