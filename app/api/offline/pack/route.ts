import { NextResponse } from "next/server";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { getSkill } from "@/lib/data/skills";
import { skillLevel } from "@/lib/engine/rating";

/**
 * Offline drill pack: ~100 LR questions around the student's level, with keys
 * and explanations so the phone can grade without the server. Personal-use
 * trade-off: the keys travel to the client; the app never shows them before
 * an answer is submitted.
 */
export async function GET(req: Request) {
  const n = Math.min(200, Math.max(20, Number(new URL(req.url).searchParams.get("n") ?? 100)));
  const db = await getDb();
  const lr = await getSkill("section", "LR");
  const level = skillLevel(lr.rating);
  const levels = Array.from(new Set([Math.max(1, level - 1), level, Math.min(4, level + 1)]));
  const seen = (await db.select({ q: schema.attempts.questionId }).from(schema.attempts).where(sql`${schema.attempts.createdAt} > now() - interval '60 days'`)).map((r) => r.q);
  const base = and(eq(schema.questions.section, "LR"), eq(schema.questions.source, "original"), inArray(schema.questions.difficulty, levels));
  const rows = await db
    .select()
    .from(schema.questions)
    .where(seen.length ? and(base, notInArray(schema.questions.id, seen)) : base)
    .orderBy(sql`random()`)
    .limit(n);
  return NextResponse.json({
    builtAt: new Date().toISOString(),
    level,
    questions: rows.map((q) => ({ id: q.id, section: q.section, type: q.type, logicTags: q.logicTags, difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices, answer: q.answer, explanations: q.explanations, keyTakeaway: q.keyTakeaway, trapPatterns: q.trapPatterns })),
  });
}
