import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

export async function getAttemptDetail(attemptId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      attempt: schema.attempts,
      question: schema.questions,
      miss: schema.misses,
    })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .leftJoin(schema.misses, eq(schema.misses.attemptId, schema.attempts.id))
    .where(eq(schema.attempts.id, attemptId));
  const r = rows[0];
  if (!r) return null;
  let passage = null;
  if (r.question.passageId) {
    const p = await db.select().from(schema.passages).where(eq(schema.passages.id, r.question.passageId));
    passage = p[0] ?? null;
  }
  return { ...r, passage };
}
