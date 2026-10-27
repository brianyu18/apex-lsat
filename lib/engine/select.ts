/**
 * Next-question selection for drilling.
 *
 * Pure function over an in-memory candidate list so it is testable; the data
 * layer supplies candidates (bank + official references + inbox items) with
 * the fields below.
 *
 * Rules
 * - auto difficulty: serve levels ≤ skill level, with `randomDifficultyPct`
 *   chance of one level above (never two). Manual levels override.
 * - interleave within the active pair: avoid serving the same type twice in a
 *   row when another type in the pair is available.
 * - exclusions: seen in the last `repeatAfterDays` days (unless repeat on),
 *   reserved-for-timed pool, explicit exclude list.
 * - sources: weighted mix; due SRS / inbox items get priority when present.
 */
import { lrTypesInPair, type Difficulty, type LRPair, type Section } from "@/lib/content/taxonomy";
import { skillLevel } from "./rating";

export type DrillSource = "bank" | "official_ref" | "inbox" | "missed" | "skipped" | "due";

export interface Candidate {
  id: string;
  section: Section;
  type: string;
  logicTags: string[];
  difficulty: Difficulty;
  source: DrillSource;
  reservedForTimed: boolean;
  lastSeenAt: string | null; // ISO
  timesSeen: number;
  passageId?: string | null;
}

export interface SelectionContext {
  section: Section;
  /** restrict to these types (null = all in section) */
  types: string[] | null;
  /** restrict to a pair (expands to its types) */
  pair: LRPair | null;
  /** restrict to candidates carrying any of these tags */
  tags: string[] | null;
  /** manual difficulty levels; null = auto */
  levels: Difficulty[] | null;
  /** 0–100: chance to serve one level above skill in auto mode */
  randomDifficultyPct: number;
  /** current rating for the relevant dimension (section or type) */
  rating: number;
  repeat: boolean;
  repeatAfterDays: number;
  sources: DrillSource[];
  excludeIds: string[];
  lastType: string | null;
  now: Date;
  rng?: () => number;
}

export const DEFAULT_CONTEXT: Omit<SelectionContext, "section" | "rating" | "now"> = {
  types: null,
  pair: null,
  tags: null,
  levels: null,
  randomDifficultyPct: 15,
  repeat: false,
  repeatAfterDays: 30,
  sources: ["due", "inbox", "bank", "official_ref"],
  excludeIds: [],
  lastType: null,
};

export function allowedLevels(ctx: Pick<SelectionContext, "levels" | "rating" | "randomDifficultyPct">, rng: () => number): Difficulty[] {
  if (ctx.levels && ctx.levels.length) return ctx.levels;
  const skill = skillLevel(ctx.rating);
  const base: Difficulty[] = ([1, 2, 3, 4] as Difficulty[]).filter((d) => d <= skill);
  const stretch = Math.min(4, skill + 1) as Difficulty;
  if (stretch > skill && rng() * 100 < ctx.randomDifficultyPct) return [stretch];
  // weight toward the top of the band: serve the skill level most often
  return base;
}

export function filterCandidates(cands: Candidate[], ctx: SelectionContext, levels: Difficulty[]): Candidate[] {
  const types = ctx.types ?? (ctx.pair ? lrTypesInPair(ctx.pair) : null);
  const cutoff = new Date(ctx.now.getTime() - ctx.repeatAfterDays * 86400000);
  const exclude = new Set(ctx.excludeIds);
  return cands.filter((c) => {
    if (c.section !== ctx.section) return false;
    if (exclude.has(c.id)) return false;
    if (c.reservedForTimed) return false;
    if (!ctx.sources.includes(c.source)) return false;
    if (types && !types.includes(c.type)) return false;
    if (ctx.tags && ctx.tags.length && !c.logicTags.some((t) => ctx.tags!.includes(t))) return false;
    // due/inbox items ignore the difficulty band and the repeat rule — they're supposed to come back
    if (c.source === "due" || c.source === "inbox" || c.source === "missed") return true;
    if (!levels.includes(c.difficulty)) return false;
    if (!ctx.repeat && c.lastSeenAt && new Date(c.lastSeenAt) > cutoff) return false;
    return true;
  });
}

const SOURCE_PRIORITY: Record<DrillSource, number> = { due: 0, inbox: 1, missed: 2, skipped: 3, bank: 4, official_ref: 4 };

export function nextQuestion(cands: Candidate[], ctx: SelectionContext): Candidate | null {
  const rng = ctx.rng ?? Math.random;
  let levels = allowedLevels(ctx, rng);
  let pool = filterCandidates(cands, ctx, levels);
  // If the stretch roll left nothing, fall back to the normal band.
  if (!pool.length && ctx.levels == null) {
    levels = allowedLevels({ ...ctx, randomDifficultyPct: 0 }, rng);
    pool = filterCandidates(cands, ctx, levels);
  }
  // Small pools (a single type, a lesson check): widen the band one level at a time rather than stalling.
  if (!pool.length && ctx.levels == null) {
    const top = Math.max(...levels);
    for (let up = top + 1; up <= 4 && !pool.length; up++) {
      levels = ([1, 2, 3, 4] as Difficulty[]).filter((d) => d <= up);
      pool = filterCandidates(cands, ctx, levels);
    }
  }
  // If still nothing and repeat is off, allow repeats rather than stalling.
  if (!pool.length && !ctx.repeat) pool = filterCandidates(cands, { ...ctx, repeat: true }, levels);
  if (!pool.length) return null;

  // Priority sources first (due > inbox > missed > skipped > fresh).
  const best = Math.min(...pool.map((c) => SOURCE_PRIORITY[c.source]));
  let tier = pool.filter((c) => SOURCE_PRIORITY[c.source] === best);

  // Interleave: avoid repeating the last type when alternatives exist.
  if (ctx.lastType) {
    const alt = tier.filter((c) => c.type !== ctx.lastType);
    if (alt.length) tier = alt;
  }

  // Prefer the top allowed level a bit more than lower ones (keeps practice near the edge).
  const top = Math.max(...levels);
  const weighted = tier.flatMap((c) => (c.difficulty === top ? [c, c] : [c]));
  // Prefer less-seen items.
  const minSeen = Math.min(...weighted.map((c) => c.timesSeen));
  const fresh = weighted.filter((c) => c.timesSeen === minSeen);
  const pick = fresh[Math.floor(rng() * fresh.length)];
  return pick ?? null;
}
