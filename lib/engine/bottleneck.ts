/**
 * Bottleneck detection.
 *
 * Over a trailing window (14 days), if any single type or tag accounts for more
 * than `shareThreshold` of counted misses (and there are at least `minMisses`
 * misses), it's a bottleneck: prescribe an untimed focus block on that
 * dimension until rolling accuracy over the last `clearWindow` counted attempts
 * exceeds `clearAccuracy`.
 */
export interface MissRow {
  type: string;
  logicTags: string[];
}
export interface RecentAttemptRow {
  type: string;
  logicTags: string[];
  correct: boolean;
  counted: boolean; // not a guess
}

export interface Bottleneck {
  dimension: "type" | "tag";
  key: string;
  share: number; // of misses
  misses: number;
  rollingAccuracy: number | null; // over last clearWindow counted attempts on this key
  rollingN: number;
  cleared: boolean;
}

export const BOTTLENECK = {
  shareThreshold: 0.3,
  minMisses: 8,
  clearWindow: 20,
  clearAccuracy: 0.85,
};

export function detectBottlenecks(misses: MissRow[], recent: RecentAttemptRow[], cfg = BOTTLENECK): Bottleneck[] {
  if (misses.length < cfg.minMisses) return [];
  const count = (dim: "type" | "tag") => {
    const m = new Map<string, number>();
    for (const r of misses) {
      const keys = dim === "type" ? [r.type] : r.logicTags;
      for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const out: Bottleneck[] = [];
  for (const dim of ["type", "tag"] as const) {
    for (const [key, n] of count(dim)) {
      const share = n / misses.length;
      if (share <= cfg.shareThreshold) continue;
      const rel = recent.filter((a) => a.counted && (dim === "type" ? a.type === key : a.logicTags.includes(key))).slice(-cfg.clearWindow);
      const acc = rel.length ? rel.filter((a) => a.correct).length / rel.length : null;
      out.push({
        dimension: dim,
        key,
        share: Math.round(share * 100) / 100,
        misses: n,
        rollingAccuracy: acc == null ? null : Math.round(acc * 100) / 100,
        rollingN: rel.length,
        cleared: rel.length >= cfg.clearWindow && acc != null && acc > cfg.clearAccuracy,
      });
    }
  }
  return out.sort((a, b) => b.share - a.share);
}
