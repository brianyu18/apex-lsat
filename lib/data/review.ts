import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { getDb, schema } from "@/lib/db/client";

export async function reviewCounts() {
  const db = await getDb();
  const today = format(new Date(), "yyyy-MM-dd");
  const [inbox] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.misses).where(eq(schema.misses.reviewed, false));
  const [due] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.misses)
    .where(and(sql`${schema.misses.nextDue} <= ${today}`, sql`${schema.misses.srsBox} < 4`));
  return { inbox: inbox?.n ?? 0, due: due?.n ?? 0 };
}

export async function inboxItems(opts: { reviewed: boolean; limit?: number }) {
  const db = await getDb();
  const since = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const conds = [eq(schema.misses.reviewed, opts.reviewed)];
  if (opts.reviewed) conds.push(gte(schema.misses.reviewedAt, new Date(since)));
  return db
    .select({
      attemptId: schema.misses.attemptId,
      questionId: schema.misses.questionId,
      errorType: schema.misses.errorType,
      errorSuggested: schema.misses.errorSuggested,
      srsBox: schema.misses.srsBox,
      nextDue: schema.misses.nextDue,
      createdAt: schema.misses.createdAt,
      reviewedAt: schema.misses.reviewedAt,
      takeaway: schema.misses.takeaway,
      type: schema.questions.type,
      difficulty: schema.questions.difficulty,
      stem: schema.questions.stem,
      stimulus: schema.questions.stimulus,
      source: schema.questions.source,
      pt: schema.questions.pt,
      sectionNumber: schema.questions.sectionNumber,
      number: schema.questions.number,
      gist: schema.questions.gist,
      answer: schema.attempts.answer,
      correct: schema.attempts.correct,
      seconds: schema.attempts.seconds,
      confidence: schema.attempts.confidence,
      guessFlag: schema.attempts.guessFlag,
      mode: schema.attempts.mode,
    })
    .from(schema.misses)
    .innerJoin(schema.questions, eq(schema.misses.questionId, schema.questions.id))
    .innerJoin(schema.attempts, eq(schema.misses.attemptId, schema.attempts.id))
    .where(and(...conds))
    .orderBy(desc(schema.misses.createdAt))
    .limit(opts.limit ?? 200);
}

export async function setReviewed(attemptId: string, reviewed: boolean) {
  const db = await getDb();
  await db
    .update(schema.misses)
    .set({ reviewed, reviewedAt: reviewed ? new Date() : null })
    .where(eq(schema.misses.attemptId, attemptId));
}
