/**
 * Apex LSAT — database schema (Postgres via Drizzle).
 *
 * Runs on PGlite locally and on Supabase/Postgres in the cloud without changes.
 *
 * Content policy: official LSAT questions are never stored. A row with
 * source = 'official_ref' carries only the reference (pt, section, number),
 * tags and the student's own data; stimulus/choices/explanations stay NULL.
 */
import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  date,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ---------------- enums ---------------- */

export const sectionEnum = pgEnum("section", ["LR", "RC"]);
export const sourceEnum = pgEnum("question_source", ["original", "official_ref"]);
export const attemptModeEnum = pgEnum("attempt_mode", ["drill", "timed", "pt", "br", "check"]);
export const confidenceEnum = pgEnum("confidence", ["sure", "leaning", "guess"]);
export const errorTypeEnum = pgEnum("error_type", [
  "misread",
  "logic_gap",
  "trap",
  "time_pressure",
  "careless",
  "guessed_right",
]);
export const sessionKindEnum = pgEnum("session_kind", ["drill", "section", "pt", "check", "skip_trainer", "writing"]);
export const skillDimensionEnum = pgEnum("skill_dimension", ["section", "type", "tag", "rc_style", "rc_qtype"]);
export const planPhaseEnum = pgEnum("plan_phase", ["foundations", "lr", "rc", "mixed", "protect"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["not_started", "in_progress", "complete"]);

/* ---------------- content ---------------- */

export const passages = pgTable("passages", {
  id: text("id").primaryKey(),
  source: sourceEnum("source").notNull().default("original"),
  pt: integer("pt"),
  section: integer("section_number"),
  passageIndex: integer("passage_index"),
  style: text("style"), // RC passage style (critique_debate, single_position, ...)
  topic: text("topic"), // law | humanities | social_science | natural_science
  comparative: boolean("comparative").notNull().default(false),
  title: text("title"),
  paragraphs: jsonb("paragraphs").$type<string[] | null>(),
  paragraphsB: jsonb("paragraphs_b").$type<string[] | null>(), // comparative passage B
  roleMap: jsonb("role_map").$type<Record<string, unknown> | null>(),
  lowResSummary: text("low_res_summary"),
  wordCount: integer("word_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    id: text("id").primaryKey(),
    source: sourceEnum("source").notNull().default("original"),
    section: sectionEnum("section").notNull(),
    // Official reference (null for originals)
    pt: integer("pt"),
    sectionNumber: integer("section_number"),
    number: integer("number"),
    // Taxonomy
    type: text("type").notNull(), // LR type or RC question type
    logicTags: jsonb("logic_tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    difficulty: integer("difficulty").notNull(), // 1–4
    difficultyCalibrated: real("difficulty_calibrated"), // from attempt data
    trapPatterns: jsonb("trap_patterns").$type<Record<string, string> | null>(), // choice -> pattern
    // Content (null for official_ref)
    passageId: text("passage_id").references(() => passages.id),
    stimulus: text("stimulus"),
    stem: text("stem"),
    choices: jsonb("choices").$type<Record<"A" | "B" | "C" | "D" | "E", string> | null>(),
    answer: text("answer"), // A–E (null for official_ref unless user records it)
    explanations: jsonb("explanations").$type<Record<string, string> | null>(), // per choice
    keyTakeaway: text("key_takeaway"),
    predictionHint: text("prediction_hint"),
    reservedForTimed: boolean("reserved_for_timed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("questions_section_type_idx").on(t.section, t.type),
    index("questions_difficulty_idx").on(t.difficulty),
    uniqueIndex("questions_official_ref_uq").on(t.pt, t.sectionNumber, t.number),
  ],
);

/* ---------------- activity ---------------- */

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    kind: sessionKindEnum("kind").notNull(),
    section: sectionEnum("section"),
    ptRef: integer("pt_ref"), // official PT number when applicable
    timed: boolean("timed").notNull().default(false),
    durationSec: integer("duration_sec"), // allotted
    elapsedSec: integer("elapsed_sec"),
    nQuestions: integer("n_questions"),
    scoreRaw: integer("score_raw"),
    scoreScaled: integer("score_scaled"),
    brRaw: integer("br_raw"),
    brScaled: integer("br_scaled"),
    settings: jsonb("settings").$type<Record<string, unknown> | null>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("sessions_kind_started_idx").on(t.kind, t.startedAt)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    mode: attemptModeEnum("mode").notNull(),
    position: integer("position"), // index within session
    answer: text("answer"), // A–E or null (blank)
    correct: boolean("correct"),
    seconds: real("seconds"),
    passageSeconds: real("passage_seconds"), // RC: time on passage before first question
    confidence: confidenceEnum("confidence"),
    guessFlag: boolean("guess_flag").notNull().default(false), // <10 s auto, user-toggleable
    flagged: boolean("flagged").notNull().default(false), // flagged for blind review
    changedFrom: text("changed_from"), // previous answer if changed
    brAnswer: text("br_answer"),
    brCorrect: boolean("br_correct"),
    prediction: text("prediction"), // prediction-mode text
    skipped: boolean("skipped").notNull().default(false),
    skillLevelAtTime: real("skill_level_at_time"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attempts_question_idx").on(t.questionId),
    index("attempts_session_idx").on(t.sessionId),
    index("attempts_created_idx").on(t.createdAt),
  ],
);

export const misses = pgTable(
  "misses",
  {
    attemptId: text("attempt_id")
      .primaryKey()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    errorType: errorTypeEnum("error_type"),
    errorSuggested: errorTypeEnum("error_suggested"),
    trapSubtype: text("trap_subtype"),
    // Journal (Demon review checklist, stored as data)
    whyChose: text("why_chose"),
    whyRejectedRight: text("why_rejected_right"),
    howPredict: text("how_predict"),
    killingWords: text("killing_words"),
    avoidNextTime: text("avoid_next_time"),
    takeaway: text("takeaway"),
    reviewed: boolean("reviewed").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // SRS
    srsBox: integer("srs_box").notNull().default(1), // 1→3d, 2→5d, 3→10d, 4 = graduated
    nextDue: date("next_due"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("misses_next_due_idx").on(t.nextDue), index("misses_question_idx").on(t.questionId)],
);

export const skills = pgTable(
  "skills",
  {
    dimension: skillDimensionEnum("dimension").notNull(),
    key: text("key").notNull(), // e.g. "LR", "flaw", "link_assumption", "critique_debate"
    rating: real("rating").notNull().default(1450),
    n: integer("n").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.dimension, t.key] })],
);

/* ---------------- learning ---------------- */

export const lessonsProgress = pgTable("lessons_progress", {
  lessonId: text("lesson_id").primaryKey(), // "u1/arguments-1"
  status: lessonStatusEnum("status").notNull().default("not_started"),
  checkScore: integer("check_score"),
  checkTotal: integer("check_total"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------- plan & settings ---------------- */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  testDate: date("test_date"), // null = undecided
  goalScore: integer("goal_score").notNull().default(175),
  hoursPerWeek: real("hours_per_week").notNull().default(10),
  daysPerWeek: integer("days_per_week").notNull().default(6),
  startDate: date("start_date"),
  diagnostic: jsonb("diagnostic").$type<{
    pt?: number;
    lr1?: number;
    lr2?: number;
    rc?: number;
    scaled?: number;
    takenOn?: string;
  } | null>(),
  drillPrefs: jsonb("drill_prefs").$type<Record<string, unknown> | null>(),
  onboarded: boolean("onboarded").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plan = pgTable("plan", {
  id: text("id").primaryKey(),
  testDate: date("test_date"),
  provisional: boolean("provisional").notNull().default(false),
  hoursPerWeek: real("hours_per_week").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  phases: jsonb("phases")
    .$type<{ phase: string; start: string; end: string; weeks: number }[]>()
    .notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const planDays = pgTable(
  "plan_days",
  {
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    phase: planPhaseEnum("phase").notNull(),
    blocks: jsonb("blocks")
      .$type<{ kind: string; minutes: number; ref?: string; label: string }[]>()
      .notNull(),
    minutes: integer("minutes").notNull(),
    completed: boolean("completed").notNull().default(false),
    completedMinutes: integer("completed_minutes").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.planId, t.day] })],
);

/* ---------------- relations ---------------- */

export const questionsRelations = relations(questions, ({ one, many }) => ({
  passage: one(passages, { fields: [questions.passageId], references: [passages.id] }),
  attempts: many(attempts),
}));
export const attemptsRelations = relations(attempts, ({ one }) => ({
  question: one(questions, { fields: [attempts.questionId], references: [questions.id] }),
  session: one(sessions, { fields: [attempts.sessionId], references: [sessions.id] }),
  miss: one(misses, { fields: [attempts.id], references: [misses.attemptId] }),
}));
export const planRelations = relations(plan, ({ many }) => ({ days: many(planDays) }));
export const planDaysRelations = relations(planDays, ({ one }) => ({
  plan: one(plan, { fields: [planDays.planId], references: [plan.id] }),
}));

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Passage = typeof passages.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Miss = typeof misses.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Plan = typeof plan.$inferSelect;
export type PlanDay = typeof planDays.$inferSelect;
