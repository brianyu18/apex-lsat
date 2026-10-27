/**
 * Timed-section assembly and blind-review scoring.
 *
 * assembleSection: picks N questions whose type mix mirrors the real test
 * (frequency-weighted), with a difficulty curve (easier early, hardest around
 * the last third, as on real LR sections), avoiding recently seen items and the
 * drill pool when a reserved pool exists.
 *
 * scoreBlindReview: timed score, BR score (timed answers overridden by BR
 * answers on flagged/blank items), the gap, and per-question outcomes.
 */
import { LR_TYPES, LR_TYPE_INFO, lrTypeShare, type Difficulty, type LRType } from "@/lib/content/taxonomy";

export interface SectionCandidate {
  id: string;
  type: string;
  difficulty: Difficulty;
  reservedForTimed: boolean;
  lastSeenAt: string | null;
  timesSeen: number;
}

export interface AssembleOptions {
  n: number; // 24–26
  preferReserved?: boolean;
  repeatAfterDays?: number;
  now?: Date;
  rng?: () => number;
}

/** Target number of each type for an n-question section (largest-remainder rounding). */
export function typeQuota(n: number): Record<LRType, number> {
  const raw = LR_TYPES.map((t) => [t, lrTypeShare(t) * n] as const);
  const floors = Object.fromEntries(raw.map(([t, v]) => [t, Math.floor(v)])) as Record<LRType, number>;
  let remaining = n - Object.values(floors).reduce((a, b) => a + b, 0);
  const byRemainder = [...raw].sort((a, b) => (b[1] - Math.floor(b[1])) - (a[1] - Math.floor(a[1])));
  for (const [t] of byRemainder) {
    if (remaining <= 0) break;
    floors[t]++;
    remaining--;
  }
  return floors;
}

/** Difficulty target by position: ~L1–2 early, mixed middle, L3–4 cluster at 60–85%, easier finish. */
export function difficultyCurve(n: number): Difficulty[] {
  const out: Difficulty[] = [];
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    if (p < 0.2) out.push(i % 3 === 2 ? 2 : 1);
    else if (p < 0.6) out.push(i % 2 === 0 ? 2 : 3);
    else if (p < 0.85) out.push(i % 3 === 0 ? 3 : 4);
    else out.push(i % 2 === 0 ? 2 : 3);
  }
  return out;
}

export function assembleSection(cands: SectionCandidate[], opts: AssembleOptions): SectionCandidate[] | null {
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - (opts.repeatAfterDays ?? 60) * 86400000);
  const fresh = cands.filter((c) => !c.lastSeenAt || new Date(c.lastSeenAt) < cutoff);
  let pool = opts.preferReserved ? fresh.filter((c) => c.reservedForTimed) : fresh;
  if (pool.length < opts.n) pool = fresh;
  if (pool.length < opts.n) pool = cands;
  if (pool.length < opts.n) return null;

  const quota = typeQuota(opts.n);
  const chosen: SectionCandidate[] = [];
  const used = new Set<string>();
  const byType = new Map<string, SectionCandidate[]>();
  for (const c of pool) byType.set(c.type, [...(byType.get(c.type) ?? []), c]);

  // Fill quotas, preferring less-seen items; borrow from frequent types when a type is short.
  for (const t of LR_TYPES) {
    let need = quota[t];
    const list = shuffle(byType.get(t) ?? [], rng).sort((a, b) => a.timesSeen - b.timesSeen);
    for (const c of list) {
      if (need <= 0) break;
      if (used.has(c.id)) continue;
      chosen.push(c);
      used.add(c.id);
      need--;
    }
  }
  if (chosen.length < opts.n) {
    const rest = shuffle(pool.filter((c) => !used.has(c.id)), rng).sort((a, b) => a.timesSeen - b.timesSeen);
    for (const c of rest) {
      if (chosen.length >= opts.n) break;
      chosen.push(c);
      used.add(c.id);
    }
  }

  // Order by the difficulty curve: for each slot pick the remaining item closest in difficulty.
  const curve = difficultyCurve(opts.n);
  const remaining = [...chosen];
  const ordered: SectionCandidate[] = [];
  for (const target of curve) {
    if (!remaining.length) break;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = Math.abs(remaining[i].difficulty - target) + rng() * 0.3;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Blind review ---------------- */

export interface BRItem {
  questionId: string;
  key: string | null;
  timedAnswer: string | null;
  flagged: boolean;
  brAnswer: string | null; // answer given during blind review (null = untouched)
}

export interface BROutcome extends BRItem {
  timedCorrect: boolean | null;
  brFinal: string | null; // answer after BR
  brCorrect: boolean | null;
  outcome: "right_right" | "right_wrong" | "wrong_right" | "wrong_wrong" | "blank_right" | "blank_wrong" | "unreviewed_miss";
}

export interface BRSummary {
  n: number;
  timedRaw: number;
  brRaw: number;
  gap: number;
  flagged: number;
  items: BROutcome[];
  /** flagged-and-changed-to-right: knowledge was there, timing wasn't */
  recovered: number;
  /** flagged-and-still-wrong: content gap */
  stuck: number;
  /** not flagged and wrong: blind spots — you were confident and wrong */
  blindSpots: number;
}

export function scoreBlindReview(items: BRItem[]): BRSummary {
  const out: BROutcome[] = items.map((it) => {
    const timedCorrect = it.key == null || it.timedAnswer == null ? (it.timedAnswer == null ? null : null) : it.timedAnswer === it.key;
    const reviewed = it.flagged || it.timedAnswer == null;
    const brFinal = reviewed && it.brAnswer != null ? it.brAnswer : it.timedAnswer;
    const brCorrect = it.key == null || brFinal == null ? null : brFinal === it.key;
    let outcome: BROutcome["outcome"];
    if (it.timedAnswer == null) outcome = brCorrect ? "blank_right" : "blank_wrong";
    else if (timedCorrect && brCorrect) outcome = "right_right";
    else if (timedCorrect && !brCorrect) outcome = "right_wrong";
    else if (!timedCorrect && brCorrect) outcome = "wrong_right";
    else outcome = reviewed ? "wrong_wrong" : "unreviewed_miss";
    return { ...it, timedCorrect, brFinal, brCorrect, outcome };
  });
  const timedRaw = out.filter((o) => o.timedCorrect).length;
  const brRaw = out.filter((o) => o.brCorrect).length;
  return {
    n: out.length,
    timedRaw,
    brRaw,
    gap: brRaw - timedRaw,
    flagged: out.filter((o) => o.flagged).length,
    items: out,
    recovered: out.filter((o) => o.outcome === "wrong_right" || o.outcome === "blank_right").length,
    stuck: out.filter((o) => o.outcome === "wrong_wrong" || o.outcome === "blank_wrong").length,
    blindSpots: out.filter((o) => o.outcome === "unreviewed_miss").length,
  };
}

export const SECTION_PRESETS = [
  { label: "Standard · 35 min", seconds: 35 * 60 },
  { label: "Time and a half · 53 min", seconds: 53 * 60 },
  { label: "Double time · 70 min", seconds: 70 * 60 },
] as const;

export { LR_TYPE_INFO };
