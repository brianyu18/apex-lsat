import type { Confidence } from "@/lib/engine/guess";
import type { DrillSettings } from "@/lib/data/drill-defaults";

export type SafeQuestion = {
  id: string;
  section: "LR" | "RC";
  type: string;
  logicTags: string[];
  difficulty: number;
  stimulus: string | null;
  stem: string | null;
  choices: Record<"A" | "B" | "C" | "D" | "E", string> | null;
  predictionHint: string | null;
  passageId: string | null;
};

export type SubmitResponse = {
  attemptId: string;
  correct: boolean | null;
  guessFlag: boolean;
  answer: string | null;
  explanations: Record<string, string> | null;
  keyTakeaway: string | null;
  trapPatterns: Record<string, string> | null;
};

export type SessionRow = {
  id: string;
  questionId: string;
  answer: string | null;
  correct: boolean | null;
  seconds: number | null;
  confidence: Confidence | null;
  guessFlag: boolean;
  position: number | null;
  type: string;
  difficulty: number;
  key: string | null;
};

export type { DrillSettings, Confidence };
