/**
 * Elo-style skill ratings.
 *
 * Each skill dimension (section, LR type, logic tag, RC style, RC question type)
 * has a rating on the chess-like scale where question difficulty levels map to
 * opponent ratings 1200 / 1450 / 1700 / 1950. A student whose true ability is
 * "comfortable at level 3" converges to ≈1700.
 *
 * K decays with the number of observations so early answers move the rating
 * fast and later ones refine it. Guesses (flagged) are ignored.
 */
import { DIFFICULTY_RATING, type Difficulty } from "@/lib/content/taxonomy";

export const RATING_DEFAULT = 1450;
export const RATING_MIN = 900;
export const RATING_MAX = 2300;

export function kFactor(n: number): number {
  if (n < 10) return 64;
  if (n < 30) return 40;
  if (n < 80) return 28;
  return 20;
}

export function expectedScore(rating: number, difficulty: Difficulty): number {
  const opp = DIFFICULTY_RATING[difficulty];
  return 1 / (1 + Math.pow(10, (opp - rating) / 400));
}

export interface RatingState {
  rating: number;
  n: number;
  correct: number;
}

export function updateRating(state: RatingState, difficulty: Difficulty, correct: boolean): RatingState {
  const e = expectedScore(state.rating, difficulty);
  const k = kFactor(state.n);
  const next = state.rating + k * ((correct ? 1 : 0) - e);
  return {
    rating: Math.max(RATING_MIN, Math.min(RATING_MAX, next)),
    n: state.n + 1,
    correct: state.correct + (correct ? 1 : 0),
  };
}

/** The highest difficulty level at which expected accuracy is still ≥ `threshold`. */
export function skillLevel(rating: number, threshold = 0.6): Difficulty {
  let level: Difficulty = 1;
  for (const d of [1, 2, 3, 4] as Difficulty[]) {
    if (expectedScore(rating, d) >= threshold) level = d;
  }
  return level;
}

/** 0–100 display scale: 1200 → ~25, 1450 → 50, 1700 → 75, 1950 → ~95. */
export function ratingToPercent(rating: number): number {
  const p = 50 + (rating - RATING_DEFAULT) / 10;
  return Math.round(Math.max(0, Math.min(100, p)));
}
