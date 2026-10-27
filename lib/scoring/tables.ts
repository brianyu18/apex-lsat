/**
 * Raw → scaled conversion and percentiles for the current-format LSAT.
 *
 * The conversion is an average of the PT150–159 curves (77 scored questions),
 * expressed as "misses allowed" anchors and interpolated between them. Real
 * forms vary by ±1–2 scaled points; this table is for practice estimation.
 *
 * Percentiles are LSAC's current three-year table (2023–24 through 2025–26).
 */

export const SCORED_QUESTIONS_DEFAULT = 77;

/** scaled score → misses allowed on a 77-question form (averaged PT150–159). */
const MISS_ANCHORS: Array<[scaled: number, misses: number]> = [
  [180, 0.5],
  [179, 1.5],
  [178, 2.2],
  [177, 3],
  [176, 3.8],
  [175, 4.5],
  [174, 5],
  [173, 5.5],
  [172, 6.5],
  [171, 7.3],
  [170, 8],
  [169, 9],
  [168, 10],
  [167, 11.2],
  [166, 12.5],
  [165, 14],
  [164, 15.5],
  [163, 17],
  [162, 18.5],
  [161, 20],
  [160, 21.5],
  [158, 25],
  [156, 28.5],
  [154, 32],
  [152, 35.5],
  [150, 39],
  [148, 42.5],
  [146, 46],
  [144, 49.5],
  [142, 53],
  [140, 56.5],
  [135, 64],
  [130, 70],
  [125, 74],
  [120, 77],
];

/** Convert a raw score to a scaled 120–180 score, scaling for forms of other lengths. */
export function rawToScaled(raw: number, total: number = SCORED_QUESTIONS_DEFAULT): number {
  if (total <= 0) return 120;
  const missRate = Math.max(0, Math.min(1, (total - raw) / total));
  const misses77 = missRate * SCORED_QUESTIONS_DEFAULT;
  // anchors sorted by misses ascending (scaled descending)
  const table = [...MISS_ANCHORS].sort((a, b) => a[1] - b[1]);
  if (misses77 <= table[0][1]) return 180;
  for (let i = 1; i < table.length; i++) {
    const [sHi, mLo] = table[i - 1];
    const [sLo, mHi] = table[i];
    if (misses77 <= mHi) {
      const t = (misses77 - mLo) / (mHi - mLo);
      return Math.round(sHi - t * (sHi - sLo));
    }
  }
  return 120;
}

/** Approximate raw score needed for a scaled score on a form of `total` questions. */
export function scaledToRaw(scaled: number, total: number = SCORED_QUESTIONS_DEFAULT): number {
  const s = Math.max(120, Math.min(180, scaled));
  const table = [...MISS_ANCHORS].sort((a, b) => b[0] - a[0]);
  let misses77 = 77;
  for (let i = 1; i < table.length; i++) {
    const [sHi, mLo] = table[i - 1];
    const [sLo, mHi] = table[i];
    if (s >= sLo) {
      const t = (sHi - s) / (sHi - sLo);
      misses77 = mLo + t * (mHi - mLo);
      break;
    }
  }
  if (s >= 180) misses77 = table[0][1];
  return Math.round(total - (misses77 / SCORED_QUESTIONS_DEFAULT) * total);
}

/** LSAC percentiles (score → percent of test takers scoring below). */
const PERCENTILES: Array<[number, number]> = [
  [180, 99.85],
  [179, 99.8],
  [178, 99.7],
  [177, 99.3],
  [176, 99.1],
  [175, 98.7],
  [174, 98.3],
  [173, 97.6],
  [172, 96.7],
  [171, 95.8],
  [170, 94.5],
  [169, 93.1],
  [168, 91.4],
  [167, 89.5],
  [166, 87.5],
  [165, 85.2],
  [164, 82.6],
  [163, 79.6],
  [162, 76.5],
  [161, 73.5],
  [160, 71.1],
  [158, 64.5],
  [156, 58],
  [154, 51],
  [152, 44.5],
  [150, 38.5],
  [148, 32.5],
  [146, 26.5],
  [144, 21],
  [142, 16],
  [140, 12],
  [135, 5],
  [130, 1.7],
  [125, 0.4],
  [120, 0],
];

export function percentile(scaled: number): number {
  const s = Math.max(120, Math.min(180, scaled));
  const t = [...PERCENTILES].sort((a, b) => b[0] - a[0]);
  for (let i = 0; i < t.length; i++) {
    if (s === t[i][0]) return t[i][1];
    if (s > t[i][0]) {
      const [hiS, hiP] = t[i - 1];
      const [loS, loP] = t[i];
      const f = (s - loS) / (hiS - loS);
      return Math.round((loP + f * (hiP - loP)) * 10) / 10;
    }
  }
  return 0;
}

/** Score bands LSAC reports: ±3 around the scaled score. */
export const SCORE_BAND = 3;
