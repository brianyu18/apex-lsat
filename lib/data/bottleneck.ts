import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { subDays } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { detectBottlenecks, type Bottleneck } from "@/lib/engine/bottleneck";

/** Computes current bottlenecks from the last 14 days of attempts. */
export async function currentBottlenecks(days = 14): Promise<Bottleneck[]> {
  const db = await getDb();
  const since = subDays(new Date(), days);
  const rows = await db
    .select({
      type: schema.questions.type,
      logicTags: schema.questions.logicTags,
      correct: schema.attempts.correct,
      guessFlag: schema.attempts.guessFlag,
      section: schema.questions.section,
      createdAt: schema.attempts.createdAt,
    })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(and(gte(schema.attempts.createdAt, since), eq(schema.questions.section, "LR"), sql`${schema.attempts.correct} is not null`))
    .orderBy(schema.attempts.createdAt);
  const misses = rows.filter((r) => r.correct === false && !r.guessFlag).map((r) => ({ type: r.type, logicTags: r.logicTags ?? [] }));
  const recent = rows.map((r) => ({ type: r.type, logicTags: r.logicTags ?? [], correct: !!r.correct, counted: !r.guessFlag }));
  return detectBottlenecks(misses, recent).filter((b) => !b.cleared);
}
