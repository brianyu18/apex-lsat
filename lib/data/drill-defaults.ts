/** Client-safe drill settings (no server imports). */
import type { Difficulty, LRPair, Section } from "@/lib/content/taxonomy";
import type { DrillSource } from "@/lib/engine/select";

export interface DrillSettings {
  section: Section;
  pair: LRPair | null;
  types: string[] | null;
  tags: string[] | null;
  levels: Difficulty[] | null; // null = auto
  randomDifficultyPct: number;
  repeat: boolean;
  sources: DrillSource[];
  predictionMode: boolean;
  count: number; // questions per session (0 = endless)
}

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  section: "LR",
  pair: null,
  types: null,
  tags: null,
  levels: null,
  randomDifficultyPct: 15,
  repeat: false,
  sources: ["due", "inbox", "bank"],
  predictionMode: false,
  count: 10,
};
