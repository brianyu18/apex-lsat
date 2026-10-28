import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "./ids";
import { rawToScaled } from "@/lib/scoring/tables";
import { nextDue } from "@/lib/engine/srs";
import type { ImportedTest } from "@/lib/import/lawhub";

/** Persists an imported official PT: official_ref questions (no text), a pt session, attempts, misses. */
export async function saveImportedTest(t: ImportedTest, opts: { takenOn?: string | null } = {}) {
  const db = await getDb();
  const scored = t.sections.filter((s) => s.scored);
  const total = scored.reduce((a, s) => a + s.questions.length, 0);
  const correct = scored.reduce((a, s) => a + s.questions.filter((q) => q.correct).length, 0);
  const scaled = t.scaled ?? rawToScaled(correct, total);
  const sessionId = newId("pt");
  const startedAt = opts.takenOn ? new Date(opts.takenOn) : new Date();
  await db.insert(schema.sessions).values({
    id: sessionId,
    kind: "pt",
    timed: true,
    ptRef: t.pt,
    nQuestions: total,
    scoreRaw: correct,
    scoreScaled: scaled,
    settings: { imported: true, source: "lawhub", sections: t.sections.map((s) => ({ index: s.sectionNumber - 1, kind: s.kind, scored: s.scored, n: s.questions.length })) },
    startedAt,
    finishedAt: startedAt,
  });
  let pos = 0;
  for (const s of t.sections) {
    for (const q of s.questions) {
      const qid = `off-${t.pt}-${s.sectionNumber}-${q.number}`;
      const existing = await db.select({ id: schema.questions.id }).from(schema.questions).where(and(eq(schema.questions.pt, t.pt), eq(schema.questions.sectionNumber, s.sectionNumber), eq(schema.questions.number, q.number)));
      if (!existing.length) {
        await db.insert(schema.questions).values({
          id: qid,
          source: "official_ref",
          section: s.kind,
          pt: t.pt,
          sectionNumber: s.sectionNumber,
          number: q.number,
          type: "unknown",
          logicTags: [],
          difficulty: 2,
          answer: q.key,
          stimulus: null,
          stem: null,
          choices: null,
          explanations: null,
        });
      }
      const id = existing[0]?.id ?? qid;
      const attemptId = newId("att");
      await db.insert(schema.attempts).values({
        id: attemptId,
        sessionId,
        questionId: id,
        mode: "pt",
        position: pos++,
        answer: q.yourAnswer,
        correct: q.correct,
        seconds: q.seconds,
        confidence: null,
        guessFlag: false,
        flagged: false,
      });
      if (s.scored && !q.correct) {
        await db.insert(schema.misses).values({ attemptId, questionId: id, reviewed: false, srsBox: 1, nextDue: nextDue(1) });
      }
    }
  }
  return { sessionId, total, correct, scaled };
}

export async function importedTests() {
  const db = await getDb();
  return db.select().from(schema.sessions).where(and(eq(schema.sessions.kind, "pt"), eq(schema.sessions.timed, true)));
}
