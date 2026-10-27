/**
 * Error-type pre-suggestion for a miss (or a lucky guess).
 *
 * Rule-based, from signals the app already has: timing, confidence, whether the
 * answer was changed, and the trap pattern attached to the chosen wrong answer.
 * The student confirms or corrects in one tap; the confirmed label is what the
 * analytics and SRS use.
 */
import type { TrapPattern } from "@/lib/content/taxonomy";

export type ErrorType = "misread" | "logic_gap" | "trap" | "time_pressure" | "careless" | "guessed_right";

export interface ClassifyInput {
  correct: boolean | null;
  guessFlag: boolean;
  seconds: number;
  confidence: "sure" | "leaning" | "guess" | null;
  changedFrom: string | null; // previous pick if changed
  changedFromWasCorrect?: boolean; // did they switch off the key?
  myTrap: TrapPattern | string | null; // trap pattern of the chosen wrong answer
  difficulty: number;
  /** median seconds for this type at this level, if known */
  typicalSeconds?: number | null;
}

export interface ClassifySuggestion {
  errorType: ErrorType;
  trapSubtype: string | null;
  reason: string;
}

const MISREAD_TRAPS = new Set(["wrong_part", "opposite", "reversal"]);
const LOGIC_TRAPS = new Set(["necessary_v_sufficient", "wrong_force", "shell_game", "comparison_shift", "half_right"]);

export function classify(i: ClassifyInput): ClassifySuggestion {
  if (i.correct && i.guessFlag) return { errorType: "guessed_right", trapSubtype: null, reason: "You got it, but flagged it (or answered in under 10 s). Worth a real look." };
  if (i.correct) return { errorType: "guessed_right", trapSubtype: null, reason: "Correct." };

  const typical = i.typicalSeconds ?? 75 + 20 * (i.difficulty - 1);

  if (i.changedFromWasCorrect) {
    return { errorType: "careless", trapSubtype: "switched_off_key", reason: "You had the right answer first and switched. Second-guessing, not knowledge." };
  }
  if (i.guessFlag || i.confidence === "guess") {
    return { errorType: "time_pressure", trapSubtype: null, reason: "You guessed. Under time this is pacing; untimed it means you didn't have a method for this one." };
  }
  if (i.seconds > typical * 1.8) {
    return { errorType: "time_pressure", trapSubtype: null, reason: `You spent ${Math.round(i.seconds)}s — well over typical for this level. Long dwell with a miss usually means the method broke down.` };
  }
  if (i.confidence === "sure" && i.seconds < typical * 0.6) {
    return { errorType: "misread", trapSubtype: null, reason: "Fast and sure but wrong — classic misread of the stem or a key word." };
  }
  if (i.myTrap && MISREAD_TRAPS.has(i.myTrap)) {
    return { errorType: "misread", trapSubtype: i.myTrap, reason: `You picked the ${label(i.myTrap)} answer, which usually means the task or the direction of the argument got flipped on the read.` };
  }
  if (i.myTrap && LOGIC_TRAPS.has(i.myTrap)) {
    return { errorType: "logic_gap", trapSubtype: i.myTrap, reason: `The ${label(i.myTrap)} trap caught you — that's a reasoning pattern to drill, not a slip.` };
  }
  if (i.myTrap) {
    return { errorType: "trap", trapSubtype: i.myTrap, reason: `You fell for the ${label(i.myTrap)} answer. Note the exact words that should have killed it.` };
  }
  return { errorType: "logic_gap", trapSubtype: null, reason: "No timing or trap signal — treat it as a gap in the method for this type." };
}

function label(p: string) {
  return p.replace(/_/g, " ");
}
