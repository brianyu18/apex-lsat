/**
 * apex-test/1 — the file format for "bring your own test".
 *
 * A test is 1–4 sections. An LR section lists questions; an RC section lists
 * passages, each with its questions. Only stem, five choices and the answer
 * are required per question; everything else is optional and improves review.
 * Uploaded tests are stored in the student's own database with source
 * "private": they are never part of the repository or the shared bank, and
 * the uploader is responsible for having the right to use the material.
 */
import { z } from "zod";
import { LR_TYPES, RC_QTYPES } from "@/lib/content/taxonomy";

const choices = z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1), E: z.string().min(1) }).strict();
const answer = z.enum(["A", "B", "C", "D", "E"]);
const difficulty = z.number().int().min(1).max(4).optional();
const explanation = z.string().max(4000).optional();
const explanations = z.partialRecord(answer, z.string().max(2000)).optional();

const lrQuestion = z
  .object({
    stimulus: z.string().min(1).max(4000),
    stem: z.string().min(1).max(600),
    choices,
    answer,
    type: z.enum(LR_TYPES).optional(),
    difficulty,
    explanation,
    explanations,
  })
  .strict();

const rcQuestion = z.object({ stem: z.string().min(1).max(600), choices, answer, type: z.enum(RC_QTYPES).optional(), difficulty, explanation, explanations }).strict();

const passage = z
  .object({
    title: z.string().max(200).optional(),
    paragraphs: z.array(z.string().min(1)).min(1).max(12),
    /** comparative reading: Passage B's paragraphs */
    paragraphsB: z.array(z.string().min(1)).min(1).max(12).optional(),
    questions: z.array(rcQuestion).min(1).max(12),
  })
  .strict();

const base = { scored: z.boolean().default(true), minutes: z.number().int().min(5).max(120).default(35) };
const lrSection = z.object({ kind: z.literal("LR"), ...base, questions: z.array(lrQuestion).min(1).max(30) }).strict();
const rcSection = z.object({ kind: z.literal("RC"), ...base, passages: z.array(passage).min(1).max(6) }).strict();

export const CustomTestSchema = z
  .object({
    format: z.literal("apex-test/1"),
    title: z.string().min(1).max(120),
    sections: z.array(z.discriminatedUnion("kind", [lrSection, rcSection])).min(1).max(4),
  })
  .strict();
export type CustomTest = z.infer<typeof CustomTestSchema>;

export function parseCustomTest(text: string): { ok: true; test: CustomTest; summary: { title: string; sections: { kind: string; scored: boolean; minutes: number; questions: number; passages?: number }[]; questions: number } } | { ok: false; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  const r = CustomTestSchema.safeParse(raw);
  if (!r.success) return { ok: false, errors: r.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  const sections = r.data.sections.map((s) => (s.kind === "LR" ? { kind: "LR", scored: s.scored, minutes: s.minutes, questions: s.questions.length } : { kind: "RC", scored: s.scored, minutes: s.minutes, questions: s.passages.reduce((a, p) => a + p.questions.length, 0), passages: s.passages.length }));
  return { ok: true, test: r.data, summary: { title: r.data.title, sections, questions: sections.filter((s) => s.scored).reduce((a, s) => a + s.questions, 0) } };
}

/** A small, entirely original example — also served at /api/custom/template. */
export const TEMPLATE: CustomTest = {
  format: "apex-test/1",
  title: "Example test (replace with your own)",
  sections: [
    {
      kind: "LR",
      scored: true,
      minutes: 5,
      questions: [
        {
          stimulus: "Every bakery on Alder Street that opened before 2010 uses a wood-fired oven. Tamsin's bakery is on Alder Street and uses a gas oven.",
          stem: "If the statements above are true, which one of the following must also be true?",
          choices: { A: "Tamsin's bakery opened in 2010 or later.", B: "Tamsin's bakery is the newest bakery on Alder Street.", C: "No bakery on Alder Street that opened after 2010 uses a wood-fired oven.", D: "Gas ovens are cheaper to run than wood-fired ovens.", E: "Most bakeries on Alder Street opened before 2010." },
          answer: "A",
          type: "must_be_true",
          difficulty: 1,
          explanation: "Contrapositive: no wood-fired oven → did not open before 2010.",
        },
        {
          stimulus: "Councilor: Since the new bike lanes were painted on Marsh Road, collisions there have fallen by a third. Clearly the bike lanes have made the road safer.",
          stem: "Which one of the following, if true, most weakens the councilor's argument?",
          choices: { A: "Bike lanes are popular with residents.", B: "Marsh Road was closed to through traffic for repairs during most of the period measured.", C: "Collisions on other roads also involve cyclists.", D: "The bike lanes were painted on schedule.", E: "Some drivers dislike the bike lanes." },
          answer: "B",
          type: "weaken",
          difficulty: 2,
        },
      ],
    },
    {
      kind: "RC",
      scored: true,
      minutes: 5,
      passages: [
        {
          title: "Harbor dredging",
          paragraphs: ["For decades the port of Wexcombe dredged its harbor every spring, on the theory that winter storms deposited the silt that threatened shipping.", "A recent survey found instead that most silt arrives in late summer, carried by the river at low flow. The author argues that the dredging calendar, not the dredging budget, is what needs to change."],
          questions: [
            { stem: "Which one of the following most accurately states the main point of the passage?", choices: { A: "Wexcombe should stop dredging its harbor.", B: "Winter storms no longer affect the harbor.", C: "Wexcombe should change when it dredges, because the silt arrives later than assumed.", D: "The dredging budget should be increased.", E: "River flow is lowest in spring." }, answer: "C", type: "main_point", difficulty: 1 },
          ],
        },
      ],
    },
  ],
};
