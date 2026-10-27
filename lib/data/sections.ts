import "server-only";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "./ids";
import { assembleSection, scoreBlindReview, type BRItem, type SectionCandidate } from "@/lib/engine/section";
import { rawToScaled } from "@/lib/scoring/tables";
import { nextDue } from "@/lib/engine/srs";
import { guessFlag } from "@/lib/engine/guess";
import type { Difficulty, Section } from "@/lib/content/taxonomy";

export interface StartSectionInput {
  section: Section;
  n: number;
  durationSec: number;
  preferReserved?: boolean;
}

/** Creates a session and returns the ordered question list (without keys). */
export async function startTimedSection(input: StartSectionInput) {
  const db = await getDb();
  const qs = await db
    .select({ id: schema.questions.id, type: schema.questions.type, difficulty: schema.questions.difficulty, reservedForTimed: schema.questions.reservedForTimed })
    .from(schema.questions)
    .where(and(eq(schema.questions.section, input.section), eq(schema.questions.source, "original")));
  const seen = await db
    .select({ questionId: schema.attempts.questionId, last: sql<string>`max(${schema.attempts.createdAt})`, n: sql<number>`count(*)::int` })
    .from(schema.attempts)
    .groupBy(schema.attempts.questionId);
  const seenMap = new Map(seen.map((s) => [s.questionId, s]));
  const cands: SectionCandidate[] = qs.map((q) => ({
    id: q.id,
    type: q.type,
    difficulty: q.difficulty as Difficulty,
    reservedForTimed: q.reservedForTimed,
    lastSeenAt: seenMap.get(q.id)?.last ?? null,
    timesSeen: seenMap.get(q.id)?.n ?? 0,
  }));
  const picked = assembleSection(cands, { n: input.n, preferReserved: input.preferReserved });
  if (!picked) return null;

  const id = newId("sec");
  await db.insert(schema.sessions).values({
    id,
    kind: "section",
    section: input.section,
    timed: true,
    durationSec: input.durationSec,
    nQuestions: picked.length,
    settings: { questionIds: picked.map((p) => p.id), n: input.n },
  });
  const full = await db.select().from(schema.questions).where(inArray(schema.questions.id, picked.map((p) => p.id)));
  const byId = new Map(full.map((q) => [q.id, q]));
  const ordered = picked.map((p) => byId.get(p.id)!);
  return {
    sessionId: id,
    questions: ordered.map((q) => ({
      id: q.id,
      section: q.section,
      type: q.type,
      logicTags: q.logicTags,
      difficulty: q.difficulty,
      stimulus: q.stimulus,
      stem: q.stem,
      choices: q.choices,
      passageId: q.passageId,
    })),
  };
}

export interface TimedAnswer {
  questionId: string;
  answer: string | null;
  seconds: number;
  flagged: boolean;
  changedFrom: string | null;
}

/** Records every timed answer as an attempt (mode=timed). Returns the flagged + blank set for blind review. */
export async function submitTimedSection(sessionId: string, answers: TimedAnswer[], elapsedSec: number) {
  const db = await getDb();
  const [ses] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  if (!ses) throw new Error("session not found");
  const ids = answers.map((a) => a.questionId);
  const qs = await db.select({ id: schema.questions.id, answer: schema.questions.answer }).from(schema.questions).where(inArray(schema.questions.id, ids));
  const key = new Map(qs.map((q) => [q.id, q.answer]));
  const rows = answers.map((a, i) => ({
    id: newId("att"),
    sessionId,
    questionId: a.questionId,
    mode: "timed" as const,
    position: i,
    answer: a.answer,
    correct: a.answer == null ? null : a.answer === key.get(a.questionId),
    seconds: a.seconds,
    confidence: null,
    guessFlag: a.answer != null && guessFlag(a.seconds, null),
    flagged: a.flagged,
    changedFrom: a.changedFrom,
  }));
  await db.insert(schema.attempts).values(rows);
  const timedRaw = rows.filter((r) => r.correct).length;
  await db.update(schema.sessions).set({ elapsedSec, scoreRaw: timedRaw, scoreScaled: rawToScaled(timedRaw, Math.round((77 / 25) * rows.length)) }).where(eq(schema.sessions.id, sessionId));
  const toReview = rows.filter((r) => r.flagged || r.answer == null).map((r) => r.questionId);
  return { timedRaw, toReview };
}

/** Records blind-review answers, computes BR score + gap, enqueues misses. */
export async function submitBlindReview(sessionId: string, brAnswers: Record<string, string>) {
  const db = await getDb();
  const attempts = await db.select().from(schema.attempts).where(and(eq(schema.attempts.sessionId, sessionId), eq(schema.attempts.mode, "timed"))).orderBy(schema.attempts.position);
  const qs = await db.select({ id: schema.questions.id, answer: schema.questions.answer }).from(schema.questions).where(inArray(schema.questions.id, attempts.map((a) => a.questionId)));
  const key = new Map(qs.map((q) => [q.id, q.answer]));

  const items: BRItem[] = attempts.map((a) => ({
    questionId: a.questionId,
    key: key.get(a.questionId) ?? null,
    timedAnswer: a.answer,
    flagged: a.flagged,
    brAnswer: brAnswers[a.questionId] ?? null,
  }));
  const summary = scoreBlindReview(items);

  for (const a of attempts) {
    const it = summary.items.find((i) => i.questionId === a.questionId)!;
    await db.update(schema.attempts).set({ brAnswer: it.brFinal, brCorrect: it.brCorrect }).where(eq(schema.attempts.id, a.id));
    // Anything not right after BR, or right only after BR, goes to the inbox.
    if (it.outcome !== "right_right") {
      const existing = await db.select().from(schema.misses).where(eq(schema.misses.attemptId, a.id));
      if (!existing.length) {
        await db.insert(schema.misses).values({
          attemptId: a.id,
          questionId: a.questionId,
          errorSuggested: it.outcome === "wrong_right" || it.outcome === "blank_right" ? "time_pressure" : it.outcome === "right_wrong" ? "careless" : null,
          reviewed: false,
          srsBox: 1,
          nextDue: nextDue(1),
        });
      }
    }
  }
  const n = attempts.length;
  const scale = Math.round((77 / 25) * n);
  await db
    .update(schema.sessions)
    .set({ brRaw: summary.brRaw, brScaled: rawToScaled(summary.brRaw, scale), finishedAt: new Date() })
    .where(eq(schema.sessions.id, sessionId));
  return { ...summary, timedScaled: rawToScaled(summary.timedRaw, scale), brScaled: rawToScaled(summary.brRaw, scale) };
}

export async function getSectionDetail(sessionId: string) {
  const db = await getDb();
  const [ses] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  if (!ses) return null;
  const rows = await db
    .select({
      attemptId: schema.attempts.id,
      questionId: schema.attempts.questionId,
      position: schema.attempts.position,
      answer: schema.attempts.answer,
      correct: schema.attempts.correct,
      seconds: schema.attempts.seconds,
      flagged: schema.attempts.flagged,
      brAnswer: schema.attempts.brAnswer,
      brCorrect: schema.attempts.brCorrect,
      changedFrom: schema.attempts.changedFrom,
      type: schema.questions.type,
      difficulty: schema.questions.difficulty,
      key: schema.questions.answer,
      stem: schema.questions.stem,
    })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(and(eq(schema.attempts.sessionId, sessionId), eq(schema.attempts.mode, "timed")))
    .orderBy(schema.attempts.position);
  return { session: ses, rows };
}

export async function recentSections(limit = 10) {
  const db = await getDb();
  return db
    .select()
    .from(schema.sessions)
    .where(and(inArray(schema.sessions.kind, ["section", "pt"]), isNotNull(schema.sessions.finishedAt)))
    .orderBy(desc(schema.sessions.startedAt))
    .limit(limit);
}

/** Questions for blind review: full content but still without keys. */
export async function getQuestionsForReview(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.select().from(schema.questions).where(inArray(schema.questions.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)!).filter(Boolean).map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices }));
}
