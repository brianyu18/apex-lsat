/**
 * Zod schemas for authored content: original LR questions, RC passages with
 * their questions, and lesson frontmatter. The content loader validates every
 * file against these before it touches the database.
 */
import { z } from "zod";
import {
  CHOICES,
  DIFFICULTY_LEVELS,
  LOGIC_TAGS,
  LR_TYPES,
  PARAGRAPH_ROLES,
  RC_QTYPES,
  RC_STYLES,
  RC_TOPICS,
  TRAP_PATTERNS,
} from "./taxonomy";

export const choiceEnum = z.enum(CHOICES);
const difficultyEnum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const choicesRecord = z
  .object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1), E: z.string().min(1) })
  .strict();

const explanationsRecord = z
  .object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1), E: z.string().min(1) })
  .strict();

/** Wrong answers must each name the pattern that makes them tempting. */
const trapPatternsRecord = z.partialRecord(choiceEnum, z.enum(TRAP_PATTERNS));

export const LRQuestionSchema = z
  .object({
    id: z.string().regex(/^lr-[a-z0-9-]+$/, "id must look like lr-<slug>"),
    section: z.literal("LR"),
    type: z.enum(LR_TYPES),
    logicTags: z.array(z.enum(LOGIC_TAGS)).max(4),
    difficulty: difficultyEnum,
    stimulus: z.string().min(40).max(1200),
    stem: z.string().min(10).max(300),
    choices: choicesRecord,
    answer: choiceEnum,
    explanations: explanationsRecord,
    trapPatterns: trapPatternsRecord,
    keyTakeaway: z.string().min(10).max(300),
    predictionHint: z.string().min(5).max(200).optional(),
    reservedForTimed: z.boolean().optional(),
  })
  .strict()
  .superRefine((q, ctx) => {
    const wrong = CHOICES.filter((c) => c !== q.answer);
    for (const c of wrong) {
      if (!q.trapPatterns[c]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trapPatterns", c], message: `wrong answer ${c} needs a trap pattern` });
      }
    }
    if (q.trapPatterns[q.answer]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trapPatterns", q.answer], message: "correct answer must not have a trap pattern" });
    }
    const texts = Object.values(q.choices).map((s) => s.trim().toLowerCase());
    if (new Set(texts).size !== 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: "answer choices must be distinct" });
    }
    if (DIFFICULTY_LEVELS.indexOf(q.difficulty) === -1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["difficulty"], message: "difficulty must be 1–4" });
    }
  });
export type LRQuestionInput = z.infer<typeof LRQuestionSchema>;

export const RCQuestionSchema = z
  .object({
    id: z.string().regex(/^rc-[a-z0-9-]+-q\d+$/, "id must look like rc-<passage-slug>-q<n>"),
    type: z.enum(RC_QTYPES),
    logicTags: z.array(z.enum(LOGIC_TAGS)).max(3).default([]),
    difficulty: difficultyEnum,
    stem: z.string().min(10).max(300),
    choices: choicesRecord,
    answer: choiceEnum,
    explanations: explanationsRecord,
    trapPatterns: trapPatternsRecord,
    keyTakeaway: z.string().min(10).max(300),
    /** paragraph indexes (0-based) that support the answer */
    evidence: z.array(z.number().int().min(0)).default([]),
  })
  .strict()
  .superRefine((q, ctx) => {
    const wrong = CHOICES.filter((c) => c !== q.answer);
    for (const c of wrong) {
      if (!q.trapPatterns[c]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trapPatterns", c], message: `wrong answer ${c} needs a trap pattern` });
      }
    }
  });

export const RCPassageSchema = z
  .object({
    id: z.string().regex(/^rc-[a-z0-9-]+$/, "id must look like rc-<slug>"),
    style: z.enum(RC_STYLES),
    topic: z.enum(RC_TOPICS),
    comparative: z.boolean().default(false),
    title: z.string().min(3).max(120),
    paragraphs: z.array(z.string().min(80)).min(2).max(6),
    paragraphsB: z.array(z.string().min(80)).min(1).max(5).optional(),
    roleMap: z.object({
      paragraphs: z.array(z.enum(PARAGRAPH_ROLES)),
      viewpoints: z.array(z.object({ who: z.string(), position: z.string(), authorAgrees: z.boolean().nullable() })),
      tone: z.string().min(3).max(60),
    }),
    lowResSummary: z.string().min(10).max(160),
    questions: z.array(RCQuestionSchema).min(5).max(8),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.roleMap.paragraphs.length !== p.paragraphs.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roleMap", "paragraphs"], message: "one role per paragraph" });
    }
    if (p.comparative && !p.paragraphsB) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paragraphsB"], message: "comparative passages need paragraphsB" });
    }
    for (const q of p.questions) {
      if (!q.id.startsWith(p.id + "-q")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["questions"], message: `question ${q.id} must be prefixed by ${p.id}` });
      }
    }
  });
export type RCPassageInput = z.infer<typeof RCPassageSchema>;

export const LessonFrontmatterSchema = z
  .object({
    id: z.string().regex(/^u[0-6]\/[a-z0-9-]+$/, "id must look like u1/arguments-1"),
    unit: z.number().int().min(0).max(6),
    order: z.number().int().min(1),
    title: z.string().min(3).max(80),
    summary: z.string().min(10).max(200),
    /** bank tags (types or logic tags) the 5-question check draws from */
    checkTags: z.array(z.string()).min(1),
    checkSection: z.enum(["LR", "RC"]).default("LR"),
    /** untimed = drill check (default); timed = short timed LR section; writing = argumentative-writing practice */
    checkMode: z.enum(["untimed", "timed", "writing"]).default("untimed"),
    diagram: z.string().optional(),
    minutes: z.number().int().min(3).max(40).default(10),
  })
  .strict();
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
