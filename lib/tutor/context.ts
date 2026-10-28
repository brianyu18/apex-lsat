import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { readLessons } from "@/lib/content/load";
import { buildGrounding, buildSystemPrompt, lessonExcerpt, type TutorAttempt, type TutorHistory, type TutorLesson, type TutorQuestion } from "./prompt";

/** Everything the tutor needs for one question, pulled from the database and the lesson files. */
export async function tutorContext(questionId: string, attemptId?: string | null) {
  const db = await getDb();
  const [q] = await db.select().from(schema.questions).where(eq(schema.questions.id, questionId));
  if (!q) return null;
  let passage: TutorQuestion["passage"] = null;
  if (q.passageId) {
    const [p] = await db.select().from(schema.passages).where(eq(schema.passages.id, q.passageId));
    if (p) passage = { title: p.title ?? "Passage", paragraphs: p.paragraphs ?? [], paragraphsB: p.paragraphsB ?? null };
  }
  const question: TutorQuestion = {
    id: q.id,
    source: q.source,
    section: q.section,
    type: q.type,
    logicTags: q.logicTags ?? [],
    difficulty: q.difficulty,
    stimulus: q.stimulus,
    stem: q.stem,
    choices: q.choices,
    answer: q.answer,
    explanations: q.explanations,
    trapPatterns: q.trapPatterns,
    keyTakeaway: q.keyTakeaway,
    officialRef: q.source === "official_ref" ? { pt: q.pt ?? 0, section: q.sectionNumber ?? 0, number: q.number ?? 0 } : null,
    passage,
  };

  let attempt: TutorAttempt | null = null;
  if (attemptId) {
    const [a] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, attemptId));
    if (a) attempt = { answer: a.answer, correct: a.correct, seconds: a.seconds, confidence: a.confidence, changedFrom: a.changedFrom, brAnswer: a.brAnswer, mode: a.mode };
  } else {
    const [a] = await db.select().from(schema.attempts).where(eq(schema.attempts.questionId, questionId)).orderBy(desc(schema.attempts.createdAt)).limit(1);
    if (a) attempt = { answer: a.answer, correct: a.correct, seconds: a.seconds, confidence: a.confidence, changedFrom: a.changedFrom, brAnswer: a.brAnswer, mode: a.mode };
  }

  // history on this type
  const dim = q.section === "RC" ? "rc_qtype" : "type";
  const [skill] = await db.select().from(schema.skills).where(and(eq(schema.skills.dimension, dim), eq(schema.skills.key, q.type)));
  const errRows = await db
    .select({ errorType: schema.misses.errorType, n: sql<number>`count(*)::int` })
    .from(schema.misses)
    .innerJoin(schema.questions, eq(schema.misses.questionId, schema.questions.id))
    .where(and(eq(schema.questions.type, q.type), isNotNull(schema.misses.errorType)))
    .groupBy(schema.misses.errorType);
  const takeRows = await db
    .select({ takeaway: schema.misses.takeaway })
    .from(schema.misses)
    .innerJoin(schema.questions, eq(schema.misses.questionId, schema.questions.id))
    .where(and(eq(schema.questions.type, q.type), isNotNull(schema.misses.takeaway)))
    .orderBy(desc(schema.misses.reviewedAt))
    .limit(3);
  const history: TutorHistory = {
    typeAccuracy: skill ? { n: skill.n, correct: skill.correct } : null,
    errorTypes: Object.fromEntries(errRows.filter((r) => r.errorType).map((r) => [r.errorType as string, r.n])),
    takeaways: takeRows.map((r) => r.takeaway!).filter(Boolean),
  };

  // lesson: the U2 lesson for this LR type, the U3 lesson for its first logic tag, or the U4 lesson for the RC qtype
  const { lessons } = await readLessons();
  const candidates = [
    ...lessons.filter((l) => l.unit === 2 && l.checkTags.includes(q.type)),
    ...lessons.filter((l) => l.unit === 4 && l.checkTags.includes(q.type)),
    ...(q.logicTags ?? []).flatMap((t) => lessons.filter((l) => l.unit === 3 && l.checkTags.includes(t))),
  ];
  const l = candidates[0];
  const lesson: TutorLesson | null = l ? { id: l.id, title: l.title, excerpt: lessonExcerpt(l.body) } : null;

  const grounding = buildGrounding(question, attempt, history, lesson);
  return { question, attempt, history, lesson, systemPrompt: buildSystemPrompt(grounding) };
}
