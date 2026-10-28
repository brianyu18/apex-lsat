/**
 * School standing and admission odds from ABA Standard 509 data.
 *
 * Each school reports its entering class's LSAT and GPA 25th/50th/75th
 * percentiles plus applicants / offers / matriculants. We treat the LSAT and
 * GPA distributions as normal (sd ≈ IQR / 1.349), place the student on each,
 * combine them (LSAT weighted 2:1 over GPA, which is roughly how admissions
 * outcomes track), and shift the school's base acceptance rate on the logit
 * scale by that position. It is an estimate for planning, not a prediction:
 * essays, work history, timing and institutional priorities move real decisions.
 *
 * Bands: likely ≥ 60% · target 25–60% · reach 8–25% · long shot < 8%.
 */
export interface School {
  id: string;
  name: string;
  state: string; // two-letter
  year: number; // 509 report year
  lsat25: number;
  lsat50: number;
  lsat75: number;
  gpa25: number;
  gpa50: number;
  gpa75: number;
  applicants: number | null;
  offers: number | null;
  matriculants: number | null;
  tags?: string[]; // e.g. "t14", "ca"
}

export interface Odds {
  schoolId: string;
  probability: number; // 0–1
  band: "likely" | "target" | "reach" | "long_shot";
  lsatPercentile: number; // where the student's LSAT falls in the class, 0–100
  gpaPercentile: number | null;
  acceptRate: number | null;
  /** lowest LSAT (at the student's GPA) that would make this a "target" */
  lsatForTarget: number | null;
  /** lowest LSAT that would make this "likely" */
  lsatForLikely: number | null;
}

const LSAT_W = 2.2;
const GPA_W = 1.1;
const erf = (x: number) => {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
const cdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function z(value: number, p25: number, p50: number, p75: number) {
  const sd = Math.max(0.5, (p75 - p25) / 1.349);
  return (value - p50) / sd;
}
function zGpa(value: number, p25: number, p50: number, p75: number) {
  const sd = Math.max(0.05, (p75 - p25) / 1.349);
  return (value - p50) / sd;
}

export function acceptRate(s: School): number | null {
  if (!s.applicants || s.offers == null) return null;
  return clamp(s.offers / s.applicants, 0.02, 0.95);
}

export function probability(s: School, lsat: number, gpa: number | null): number {
  const base = acceptRate(s) ?? 0.3;
  const zl = clamp(z(lsat, s.lsat25, s.lsat50, s.lsat75), -2.5, 2.5);
  const zg = gpa == null ? 0 : clamp(zGpa(gpa, s.gpa25, s.gpa50, s.gpa75), -2.5, 2.5);
  return clamp(sigmoid(logit(base) + LSAT_W * zl + GPA_W * zg), 0.01, 0.97);
}

export function band(p: number): Odds["band"] {
  return p >= 0.6 ? "likely" : p >= 0.25 ? "target" : p >= 0.08 ? "reach" : "long_shot";
}

export function odds(s: School, lsat: number, gpa: number | null): Odds {
  const p = probability(s, lsat, gpa);
  const needed = (threshold: number): number | null => {
    for (let l = 120; l <= 180; l++) if (probability(s, l, gpa) >= threshold) return l;
    return null;
  };
  return {
    schoolId: s.id,
    probability: Math.round(p * 100) / 100,
    band: band(p),
    lsatPercentile: Math.round(cdf(z(lsat, s.lsat25, s.lsat50, s.lsat75)) * 100),
    gpaPercentile: gpa == null ? null : Math.round(cdf(zGpa(gpa, s.gpa25, s.gpa50, s.gpa75)) * 100),
    acceptRate: acceptRate(s),
    lsatForTarget: needed(0.25),
    lsatForLikely: needed(0.6),
  };
}

export const BAND_LABEL: Record<Odds["band"], string> = { likely: "Likely", target: "Target", reach: "Reach", long_shot: "Long shot" };

/** Registration goal implied by a target list: the median of the most selective target, or null. */
export function goalFromTargets(schools: School[]): number | null {
  if (!schools.length) return null;
  return Math.max(...schools.map((s) => s.lsat50));
}
