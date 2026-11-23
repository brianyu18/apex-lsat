/**
 * Strategy decks: short, slide-by-slide interactive walkthroughs of a section
 * skill or a question type. Each deck is one JSON file in content/decks.
 * Worked examples are written into the deck; practice questions are drawn
 * from the bank at render time, so they carry the bank's own explanations.
 */
import { z } from "zod";

const text = z.string().min(1);
const Letter = z.enum(["A", "B", "C", "D", "E"]);
const Choices = z.object({ A: text, B: text, C: text, D: text, E: text }).strict();

const Idea = z.object({ kind: z.literal("idea"), title: text, body: z.array(text).min(1).max(5), callout: text.optional() }).strict();
const Stems = z.object({ kind: z.literal("stems"), title: text, stems: z.array(text).min(1).max(8), note: text.optional() }).strict();
const Method = z
  .object({ kind: z.literal("method"), title: text, steps: z.array(z.object({ label: z.string().min(1).max(40), do: text }).strict()).min(2).max(7) })
  .strict();
const Worked = z
  .object({
    kind: z.literal("worked"),
    title: text,
    /** RC: a short passage; LR: leave out and use stimulus */
    passage: z.object({ title: text.optional(), paragraphs: z.array(text).min(1).max(6), paragraphsB: z.array(text).min(1).max(6).optional() }).strict().optional(),
    stimulus: text.optional(),
    stem: text,
    choices: Choices,
    answer: Letter,
    /** each step can highlight a phrase that appears word for word in the stimulus or passage */
    steps: z.array(z.object({ label: z.string().min(1).max(40), note: text, highlight: text.optional() }).strict()).min(2).max(6),
    why: z.object({ A: text, B: text, C: text, D: text, E: text }).strict(),
  })
  .strict();
const Traps = z
  .object({ kind: z.literal("traps"), title: text, traps: z.array(z.object({ name: text, tell: text, example: text.optional() }).strict()).min(2).max(8) })
  .strict();
const Table = z.object({ kind: z.literal("table"), title: text, head: z.array(text).min(2).max(4), rows: z.array(z.array(z.string())).min(1).max(14), note: text.optional() }).strict();
const Practice = z.object({ kind: z.literal("practice"), title: text, count: z.number().int().min(1).max(4).default(3) }).strict();
const CheatCard = z.object({ kind: z.literal("card"), title: text, lines: z.array(text).min(2).max(8) }).strict();

export const SlideSchema = z.discriminatedUnion("kind", [Idea, Stems, Method, Worked, Traps, Table, Practice, CheatCard]);
export type Slide = z.infer<typeof SlideSchema>;
export type WorkedSlide = z.infer<typeof Worked>;

export const DeckSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: text,
    summary: z.string().min(1).max(220),
    group: z.enum(["foundations", "lr", "rc"]),
    order: z.number().int().min(1),
    section: z.enum(["LR", "RC"]),
    /** question types this deck teaches; practice questions are drawn from these */
    types: z.array(z.string()).default([]),
    /** related lessons in the curriculum, by lesson id */
    lessonIds: z.array(z.string()).default([]),
    minutes: z.number().int().min(1).max(40),
    slides: z.array(SlideSchema).min(3).max(14),
  })
  .strict();
export type Deck = z.infer<typeof DeckSchema>;

export const DECK_GROUPS: Record<Deck["group"], { title: string; blurb: string }> = {
  foundations: { title: "Foundations", blurb: "The moves every question uses: reading arguments, conditional logic, flaws, wrong answers and pacing." },
  lr: { title: "Logical Reasoning by question type", blurb: "One deck per question family: how to spot it, the method, a worked example and live practice." },
  rc: { title: "Reading Comprehension", blurb: "How to read a passage, then each question family with a worked mini-passage." },
};

/** Highlight helper shared by the player and the validator. */
export function workedText(w: WorkedSlide): string {
  return [w.stimulus ?? "", ...(w.passage?.paragraphs ?? []), ...(w.passage?.paragraphsB ?? [])].join("\n");
}
