import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { format } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "./ids";
import { getSkill } from "./skills";
import { recordObservation } from "./skills";
import { DEFAULT_CONTEXT, nextQuestion, type Candidate, type SelectionContext } from "@/lib/engine/select";
import { guessFlag, type Confidence } from "@/lib/engine/guess";
import { advance, nextDue } from "@/lib/engine/srs";
import type { Difficulty, Section } from "@/lib/content/taxonomy";
import type { Question } from "@/lib/db/schema";

export { DEFAULT_DRILL_SETTINGS, type DrillSettings } from "./drill-defaults";
import { type DrillSettings } from "./drill-defaults";

/** Builds the candidate list from the DB for the selector. */
async function candidates(section: Section): Promise<Candidate[]> {
  const db = await getDb();
  const today = format(new Date(), "yyyy-MM-dd");
  const qs = await db
    .select({
      id: schema.questions.id,
      section: schema.questions.section,
      type: schema.questions.type,
      logicTags: schema.questions.logicTags,
      difficulty: schema.questions.difficulty,
      source: schema.questions.source,
      reservedForTimed: schema.questions.reservedForTimed,
      passageId: schema.questions.passageId,
    })
    .from(schema.questions)
    .where(and(eq(schema.questions.section, section), eq(schema.questions.source, "original")));

  const seen = await db
    .select({ questionId: schema.attempts.questionId, last: sql<string>`max(${schema.attempts.createdAt})`, n: sql<number>`count(*)::int` })
    .from(schema.attempts)
    .groupBy(schema.attempts.questionId);
  const seenMap = new Map(seen.map((s) => [s.questionId, s]));

  const due = await db
    .select({ questionId: schema.misses.questionId })
    .from(schema.misses)
    .where(and(sql`${schema.misses.nextDue} <= ${today}`, sql`${schema.misses.srsBox} < 4`));
  const dueSet = new Set(due.map((d) => d.questionId));
  const inbox = await db
    .select({ questionId: schema.misses.questionId })
    .from(schema.misses)
    .where(eq(schema.misses.reviewed, false));
  const inboxSet = new Set(inbox.map((d) => d.questionId));

  return qs.map((q) => ({
    id: q.id,
    section: q.section,
    type: q.type,
    logicTags: q.logicTags ?? [],
    difficulty: q.difficulty as Difficulty,
    source: dueSet.has(q.id) ? "due" : inboxSet.has(q.id) ? "inbox" : "bank",
    reservedForTimed: q.reservedForTimed,
    lastSeenAt: seenMap.get(q.id)?.last ?? null,
    timesSeen: seenMap.get(q.id)?.n ?? 0,
    passageId: q.passageId,
  }));
}

export async function pickNext(settings: DrillSettings, excludeIds: string[], lastType: string | null): Promise<Question | null> {
  const cands = await candidates(settings.section);
  const dimKey = settings.types?.length === 1 ? settings.types[0] : settings.section;
  const skill = await getSkill(settings.types?.length === 1 ? (settings.section === "RC" ? "rc_qtype" : "type") : "section", dimKey);
  const ctx: SelectionContext = {
    ...DEFAULT_CONTEXT,
    section: settings.section,
    pair: settings.pair,
    types: settings.types,
    tags: settings.tags,
    levels: settings.levels,
    randomDifficultyPct: settings.randomDifficultyPct,
    repeat: settings.repeat,
    sources: settings.sources,
    excludeIds,
    lastType,
    rating: skill.rating,
    now: new Date(),
  };
  const pick = nextQuestion(cands, ctx);
  if (!pick) return null;
  const db = await getDb();
  const rows = await db.select().from(schema.questions).where(eq(schema.questions.id, pick.id));
  return rows[0] ?? null;
}

export async function startSession(kind: "drill" | "check", settings: Partial<DrillSettings>) {
  const db = await getDb();
  const id = newId("ses");
  await db.insert(schema.sessions).values({ id, kind, section: settings.section ?? "LR", timed: false, settings });
  return id;
}

export async function finishSession(id: string) {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)::int`, c: sql<number>`sum(case when correct then 1 else 0 end)::int` }).from(schema.attempts).where(eq(schema.attempts.sessionId, id));
  await db
    .update(schema.sessions)
    .set({ finishedAt: new Date(), nQuestions: rows[0]?.n ?? 0, scoreRaw: rows[0]?.c ?? 0 })
    .where(eq(schema.sessions.id, id));
}

export interface SubmitInput {
  sessionId: string | null;
  questionId: string;
  mode: "drill" | "check" | "timed" | "pt";
  position?: number;
  answer: string | null;
  seconds: number;
  passageSeconds?: number | null;
  confidence: Confidence | null;
  prediction?: string | null;
  changedFrom?: string | null;
  flagged?: boolean;
  skillLevelAtTime?: number;
}

export interface SubmitResult {
  attemptId: string;
  correct: boolean | null;
  guessFlag: boolean;
  answer: string | null;
  question: Question;
}

/** Records an attempt, updates ratings (unless a guess/blank), and enqueues misses for review. */
export async function submitAttempt(input: SubmitInput): Promise<SubmitResult> {
  const db = await getDb();
  const [q] = await db.select().from(schema.questions).where(eq(schema.questions.id, input.questionId));
  if (!q) throw new Error("question not found");
  const correct = input.answer == null ? null : q.answer != null ? input.answer === q.answer : null;
  const guess = guessFlag(input.seconds, input.confidence);
  const attemptId = newId("att");
  await db.insert(schema.attempts).values({
    id: attemptId,
    sessionId: input.sessionId,
    questionId: q.id,
    mode: input.mode,
    position: input.position ?? null,
    answer: input.answer,
    correct,
    seconds: input.seconds,
    passageSeconds: input.passageSeconds ?? null,
    confidence: input.confidence,
    guessFlag: guess,
    flagged: input.flagged ?? false,
    changedFrom: input.changedFrom ?? null,
    prediction: input.prediction ?? null,
    skillLevelAtTime: input.skillLevelAtTime ?? null,
  });

  if (correct != null && !guess && (input.mode === "drill" || input.mode === "check")) {
    let rcStyle: string | null = null;
    if (q.section === "RC" && q.passageId) {
      const [p] = await db.select({ style: schema.passages.style }).from(schema.passages).where(eq(schema.passages.id, q.passageId));
      rcStyle = p?.style ?? null;
    }
    await recordObservation({
      section: q.section,
      type: q.type,
      logicTags: q.logicTags ?? [],
      rcStyle,
      difficulty: q.difficulty as Difficulty,
      correct,
    });
  }

  // Spaced re-drill: if this question already sits in the SRS (an earlier miss), advance or reset its box.
  const existing = await db
    .select()
    .from(schema.misses)
    .where(and(eq(schema.misses.questionId, q.id), sql`${schema.misses.srsBox} < 4`))
    .orderBy(desc(schema.misses.createdAt))
    .limit(1);
  const prior = existing[0];
  if (prior && correct != null && input.mode === "drill") {
    const box = advance(prior.srsBox, correct, guess);
    await db.update(schema.misses).set({ srsBox: box, nextDue: nextDue(box) }).where(eq(schema.misses.attemptId, prior.attemptId));
  }

  // New misses and guessed-right answers go to the review inbox (unless this was an SRS re-drill of an item still in the system).
  if ((correct === false || (correct === true && guess)) && !prior) {
    await db.insert(schema.misses).values({
      attemptId,
      questionId: q.id,
      errorSuggested: correct ? "guessed_right" : null,
      errorType: correct ? "guessed_right" : null,
      reviewed: false,
      srsBox: 1,
      nextDue: nextDue(1),
    });
  }

  return { attemptId, correct, guessFlag: guess, answer: input.answer, question: q };
}

export async function setGuessFlag(attemptId: string, flag: boolean) {
  const db = await getDb();
  await db.update(schema.attempts).set({ guessFlag: flag }).where(eq(schema.attempts.id, attemptId));
}

export async function sessionSummary(sessionId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.attempts.id,
      questionId: schema.attempts.questionId,
      answer: schema.attempts.answer,
      correct: schema.attempts.correct,
      seconds: schema.attempts.seconds,
      confidence: schema.attempts.confidence,
      guessFlag: schema.attempts.guessFlag,
      position: schema.attempts.position,
      type: schema.questions.type,
      difficulty: schema.questions.difficulty,
      key: schema.questions.answer,
    })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(eq(schema.attempts.sessionId, sessionId))
    .orderBy(schema.attempts.position, schema.attempts.createdAt);
  return rows;
}

export async function recentSessions(limit = 10) {
  const db = await getDb();
  return db.select().from(schema.sessions).where(eq(schema.sessions.kind, "drill")).orderBy(desc(schema.sessions.startedAt)).limit(limit);
}

export async function getQuestions(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  return db.select().from(schema.questions).where(inArray(schema.questions.id, ids));
}

export async function bankStats(section: Section) {
  const db = await getDb();
  const rows = await db
    .select({ type: schema.questions.type, difficulty: schema.questions.difficulty, n: sql<number>`count(*)::int` })
    .from(schema.questions)
    .where(and(eq(schema.questions.section, section), eq(schema.questions.source, "original"), isNull(schema.questions.pt)))
    .groupBy(schema.questions.type, schema.questions.difficulty);
  return rows;
}
