/**
 * apex-test/1 — the file format for "bring your own test".
 *
 * A test is 1–4 sections. An LR section lists questions; an RC section lists
 * passages, each with its questions. Only stem, five choices and the answer
 * are required per question; everything else is optional. The indexing fields
 * (test id/number/year, section id/order, question number/id/category/skill,
 * totals) are checked for consistency and stored with the test.
 * Uploaded tests are stored in the student's own database with source
 * "private": they are never part of the repository or the shared bank, and
 * the uploader is responsible for having the right to use the material.
 */
import { z } from "zod";
import { LR_TYPES, RC_QTYPES } from "@/lib/content/taxonomy";

const choices = z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1), E: z.string().min(1) }).strict();
const answer = z.enum(["A", "B", "C", "D", "E"]);
/** 1–5 accepted; the app works on a 1–4 scale, so 5 is stored as 4. */
const difficulty = z.number().int().min(1).max(5).optional();
const explanation = z.string().max(4000).optional();
const explanations = z.partialRecord(answer, z.string().max(2000)).optional();
const ident = z.string().min(1).max(80).optional();
const credits = z.array(z.string().min(1).max(600)).max(20).optional();
const label = z.string().max(120).nullish();

/** Indexing fields shared by LR and RC questions. `type` is free text here; unknown values import as "unclassified" with a warning. */
const qMeta = { number: z.number().int().min(1).max(200).optional(), id: ident, type: z.string().max(80).nullish(), category: label, skill: label, difficulty, explanation, explanations };

const lrQuestion = z.object({ stimulus: z.string().min(1).max(4000), stem: z.string().min(1).max(600), choices, answer, ...qMeta }).strict();

const rcQuestion = z
  .object({
    stem: z.string().min(1).max(600),
    choices,
    answer,
    ...qMeta,
    /** the passage text the question points at; paragraph is a 0-based index into paragraphs (or paragraphsB when passage is "B") */
    reference: z.object({ text: z.string().min(1).max(1000), paragraph: z.number().int().min(0).max(11).optional(), passage: z.enum(["A", "B"]).optional() }).strict().nullish(),
  })
  .strict();

const passage = z
  .object({
    id: ident,
    title: z.string().max(200).nullish(),
    subject: label,
    comparative: z.boolean().optional(),
    paragraphs: z.array(z.string().min(1)).min(1).max(12),
    /** comparative reading: Passage B's paragraphs */
    paragraphsB: z.array(z.string().min(1)).min(1).max(12).optional(),
    credits,
    questions: z.array(rcQuestion).min(1).max(12),
  })
  .strict();

const base = { id: ident, order: z.number().int().min(1).max(10).optional(), scored: z.boolean().default(true), minutes: z.number().int().min(5).max(120).default(35), directions: z.string().max(3000).nullish(), credits };
const lrSection = z.object({ kind: z.literal("LR"), ...base, questions: z.array(lrQuestion).min(1).max(30) }).strict();
const rcSection = z.object({ kind: z.literal("RC"), ...base, passages: z.array(passage).min(1).max(6) }).strict();

export const CustomTestSchema = z
  .object({
    format: z.literal("apex-test/1"),
    /** your own identifier for the test; a second upload with the same id is refused */
    id: ident,
    number: z.number().int().min(0).max(9999).optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    title: z.string().min(1).max(120),
    description: z.string().max(600).nullish(),
    /** optional checksum: when present, each count must match the file */
    totals: z.object({ sections: z.number().int().optional(), questions: z.number().int().optional(), scoredQuestions: z.number().int().optional() }).strict().optional(),
    sections: z.array(z.discriminatedUnion("kind", [lrSection, rcSection])).min(1).max(4),
  })
  .strict();
export type CustomTest = z.infer<typeof CustomTestSchema>;
type Section = CustomTest["sections"][number];

export const sectionQuestions = (s: Section) => (s.kind === "LR" ? s.questions : s.passages.flatMap((p) => p.questions));

/** "Main Point" → "main_point"; returns null when the value is not one of the app's types for that section. */
export function normalizeType(kind: "LR" | "RC", raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return ((kind === "LR" ? LR_TYPES : RC_QTYPES) as readonly string[]).includes(t) ? t : null;
}

/** Cross-field rules the shape alone cannot express. Paths match zod's (sections.0.questions.3…). */
function check(t: CustomTest): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dup = (vals: (string | number | undefined)[], what: string) => {
    const seen = new Set<string | number>();
    for (const v of vals) {
      if (v == null) continue;
      if (seen.has(v)) errors.push(`${what}: "${v}" is used more than once`);
      seen.add(v);
    }
  };
  const orders = t.sections.map((s) => s.order);
  if (orders.some((o) => o != null) && orders.some((o) => o == null)) errors.push("sections: give every section an order, or none");
  dup(orders, "sections.order");
  dup(t.sections.map((s) => s.id), "sections.id");
  dup(t.sections.flatMap((s) => sectionQuestions(s).map((q) => q.id)), "question id");
  dup(t.sections.flatMap((s) => (s.kind === "RC" ? s.passages.map((p) => p.id) : [])), "passage id");
  const unknown = new Map<string, number>();
  t.sections.forEach((s, si) => {
    const qs = sectionQuestions(s);
    const nums = qs.map((q) => q.number);
    if (nums.some((n) => n != null)) {
      if (nums.some((n) => n == null)) errors.push(`sections.${si}: give every question a number, or none`);
      else if (nums.some((n, i) => n !== i + 1)) errors.push(`sections.${si}: question numbers must run 1…${qs.length} in file order (found ${nums.join(", ")})`);
    }
    for (const q of qs) if (q.type && !normalizeType(s.kind, q.type)) unknown.set(`${s.kind} "${q.type}"`, (unknown.get(`${s.kind} "${q.type}"`) ?? 0) + 1);
    if (s.kind === "RC")
      s.passages.forEach((p, pi) => {
        const path = `sections.${si}.passages.${pi}`;
        if (p.comparative === true && !p.paragraphsB) errors.push(`${path}: comparative is true but paragraphsB is missing`);
        if (p.comparative === false && p.paragraphsB) errors.push(`${path}: paragraphsB is present but comparative is false`);
        p.questions.forEach((q, qi) => {
          const r = q.reference;
          if (!r) return;
          const paras = r.passage === "B" ? p.paragraphsB : p.paragraphs;
          if (!paras) return void errors.push(`${path}.questions.${qi}.reference: passage "B" does not exist`);
          if (r.paragraph != null && r.paragraph >= paras.length) return void errors.push(`${path}.questions.${qi}.reference.paragraph: ${r.paragraph} is past the last paragraph (0–${paras.length - 1})`);
          const hay = r.paragraph != null ? [paras[r.paragraph]] : paras;
          if (!hay.some((x) => x.includes(r.text))) warnings.push(`${path}.questions.${qi}.reference.text was not found word for word in the passage; check the quote`);
        });
      });
  });
  for (const [k, n] of unknown) warnings.push(`${n} question${n === 1 ? "" : "s"} with type ${k}: not one of the app's types, imported as unclassified`);
  if (t.totals) {
    const all = t.sections.reduce((a, s) => a + sectionQuestions(s).length, 0);
    const scored = t.sections.filter((s) => s.scored).reduce((a, s) => a + sectionQuestions(s).length, 0);
    if (t.totals.sections != null && t.totals.sections !== t.sections.length) errors.push(`totals.sections says ${t.totals.sections}, the file has ${t.sections.length}`);
    if (t.totals.questions != null && t.totals.questions !== all) errors.push(`totals.questions says ${t.totals.questions}, the file has ${all}`);
    if (t.totals.scoredQuestions != null && t.totals.scoredQuestions !== scored) errors.push(`totals.scoredQuestions says ${t.totals.scoredQuestions}, the file has ${scored}`);
  }
  return { errors, warnings };
}

export type CustomSummary = { title: string; label: string | null; sections: { kind: string; scored: boolean; minutes: number; questions: number; passages?: number }[]; questions: number; warnings: string[] };

export function parseCustomTest(text: string): { ok: true; test: CustomTest; summary: CustomSummary } | { ok: false; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  const r = CustomTestSchema.safeParse(raw);
  if (!r.success) return { ok: false, errors: r.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  const { errors, warnings } = check(r.data);
  if (errors.length) return { ok: false, errors: errors.slice(0, 12) };
  // sections are taken in `order` when given, otherwise in file order
  const test: CustomTest = { ...r.data, sections: r.data.sections.every((s) => s.order != null) ? [...r.data.sections].sort((a, b) => a.order! - b.order!) : r.data.sections };
  const sections = test.sections.map((s) => (s.kind === "LR" ? { kind: "LR", scored: s.scored, minutes: s.minutes, questions: s.questions.length } : { kind: "RC", scored: s.scored, minutes: s.minutes, questions: s.passages.reduce((a, p) => a + p.questions.length, 0), passages: s.passages.length }));
  const label = [test.number != null ? `#${test.number}` : null, test.year ?? null, test.id ?? null].filter((x) => x != null).join(" · ") || null;
  return { ok: true, test, summary: { title: test.title, label, sections, questions: sections.filter((s) => s.scored).reduce((a, s) => a + s.questions, 0), warnings: warnings.slice(0, 8) } };
}

/** A small, entirely original example — also served at /api/custom/template. */
export const TEMPLATE: CustomTest = {
  format: "apex-test/1",
  id: "EXAMPLE-001",
  number: 1,
  year: 2026,
  title: "Example test (replace with your own)",
  description: "Two short sections that show every field the importer reads.",
  totals: { sections: 2, questions: 3, scoredQuestions: 3 },
  sections: [
    {
      id: "EXAMPLE-001-S1",
      order: 1,
      directions: "Each question is based on the reasoning in a short passage. Choose the best answer.",
      kind: "LR",
      scored: true,
      minutes: 5,
      questions: [
        {
          stimulus: "Every bakery on Alder Street that opened before 2010 uses a wood-fired oven. Tamsin's bakery is on Alder Street and uses a gas oven.",
          stem: "If the statements above are true, which one of the following must also be true?",
          choices: { A: "Tamsin's bakery opened in 2010 or later.", B: "Tamsin's bakery is the newest bakery on Alder Street.", C: "No bakery on Alder Street that opened after 2010 uses a wood-fired oven.", D: "Gas ovens are cheaper to run than wood-fired ovens.", E: "Most bakeries on Alder Street opened before 2010." },
          answer: "A",
          number: 1,
          id: "EXAMPLE-001-S1-Q01",
          category: "Deduction",
          skill: "Conditional reasoning",
          type: "must_be_true",
          difficulty: 1,
          explanation: "Contrapositive: no wood-fired oven → did not open before 2010.",
        },
        {
          stimulus: "Councilor: Since the new bike lanes were painted on Marsh Road, collisions there have fallen by a third. Clearly the bike lanes have made the road safer.",
          stem: "Which one of the following, if true, most weakens the councilor's argument?",
          choices: { A: "Bike lanes are popular with residents.", B: "Marsh Road was closed to through traffic for repairs during most of the period measured.", C: "Collisions on other roads also involve cyclists.", D: "The bike lanes were painted on schedule.", E: "Some drivers dislike the bike lanes." },
          answer: "B",
          number: 2,
          id: "EXAMPLE-001-S1-Q02",
          category: "Argument evaluation",
          type: "weaken",
          difficulty: 2,
        },
      ],
    },
    {
      id: "EXAMPLE-001-S2",
      order: 2,
      directions: "Answer each question on the basis of what the passage states or implies.",
      kind: "RC",
      scored: true,
      minutes: 5,
      passages: [
        {
          id: "EXAMPLE-001-S2-P1",
          title: "Harbor dredging",
          subject: "Science",
          comparative: false,
          credits: ["Written for this example."],
          paragraphs: ["For decades the port of Wexcombe dredged its harbor every spring, on the theory that winter storms deposited the silt that threatened shipping.", "A recent survey found instead that most silt arrives in late summer, carried by the river at low flow. The author argues that the dredging calendar, not the dredging budget, is what needs to change."],
          questions: [
            { stem: "Which one of the following most accurately states the main point of the passage?", choices: { A: "Wexcombe should stop dredging its harbor.", B: "Winter storms no longer affect the harbor.", C: "Wexcombe should change when it dredges, because the silt arrives later than assumed.", D: "The dredging budget should be increased.", E: "River flow is lowest in spring." }, answer: "C", number: 1, id: "EXAMPLE-001-S2-Q01", type: "main_point", category: "Global", difficulty: 1, reference: { text: "the dredging calendar, not the dredging budget", paragraph: 1 } },
          ],
        },
      ],
    },
  ],
};
