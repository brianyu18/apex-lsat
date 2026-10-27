/**
 * Spaced re-drill scheduler (Leitner, adapted for LSAT skill transfer).
 *
 * Box 1 → due in 3 days, box 2 → 5 days, box 3 → 10 days, box 4 = graduated.
 * A correct, non-guess re-drill advances a box; a miss resets to box 1.
 * Each due item is paired with a structurally similar fresh question so the
 * student practices the pattern, not the memory of the item.
 */
import { addDays, format } from "date-fns";

export const BOX_DAYS: Record<number, number> = { 1: 3, 2: 5, 3: 10 };
export const GRADUATED = 4;

export function nextDue(box: number, from: Date = new Date()): string | null {
  if (box >= GRADUATED) return null;
  return format(addDays(from, BOX_DAYS[box] ?? 10), "yyyy-MM-dd");
}

export function advance(box: number, correct: boolean, guess: boolean): number {
  if (!correct || guess) return 1;
  return Math.min(GRADUATED, box + 1);
}

export interface SimilarCandidate {
  id: string;
  type: string;
  logicTags: string[];
  difficulty: number;
}

/** Pick a different question with the same type, ≥1 shared tag (if any), same level (±1 fallback). */
export function pickSimilar(target: SimilarCandidate, pool: SimilarCandidate[], rng: () => number = Math.random): SimilarCandidate | null {
  const others = pool.filter((p) => p.id !== target.id && p.type === target.type);
  if (!others.length) return null;
  const shareTag = (p: SimilarCandidate) => !target.logicTags.length || p.logicTags.some((t) => target.logicTags.includes(t));
  const tiers = [
    others.filter((p) => p.difficulty === target.difficulty && shareTag(p)),
    others.filter((p) => Math.abs(p.difficulty - target.difficulty) <= 1 && shareTag(p)),
    others.filter((p) => p.difficulty === target.difficulty),
    others,
  ];
  for (const t of tiers) if (t.length) return t[Math.floor(rng() * t.length)];
  return null;
}
