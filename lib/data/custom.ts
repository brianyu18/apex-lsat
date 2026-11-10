import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "./ids";
import type { CustomTest } from "@/lib/custom/schema";
import type { PtBuild, PtSectionSpec } from "./pt";

/** Stores an uploaded test: passages + questions (source "private") and the test record. */
export async function saveCustomTest(t: CustomTest) {
  const db = await getDb();
  const id = newId("cst");
  const sections: (typeof schema.customTests.$inferInsert)["sections"] = [];
  const qRows: (typeof schema.questions.$inferInsert)[] = [];
  const pRows: (typeof schema.passages.$inferInsert)[] = [];
  const expl = (q: { explanation?: string; explanations?: Partial<Record<string, string>>; answer: string }) => {
    const e: Record<string, string> = { ...(q.explanations ?? {}) } as Record<string, string>;
    if (q.explanation && !e[q.answer]) e[q.answer] = q.explanation;
    return Object.keys(e).length ? e : null;
  };
  t.sections.forEach((s, si) => {
    if (s.kind === "LR") {
      const ids = s.questions.map((q, qi) => {
        const qid = `${id}-s${si + 1}-q${qi + 1}`;
        qRows.push({ id: qid, source: "private", section: "LR", type: q.type ?? "unclassified", logicTags: [], difficulty: q.difficulty ?? 2, stimulus: q.stimulus, stem: q.stem, choices: q.choices, answer: q.answer, explanations: expl(q) });
        return qid;
      });
      sections.push({ kind: "LR", scored: s.scored, minutes: s.minutes, questionIds: ids });
    } else {
      const ids: string[] = [];
      const pids: string[] = [];
      s.passages.forEach((p, pi) => {
        const pid = `${id}-s${si + 1}-p${pi + 1}`;
        pids.push(pid);
        pRows.push({ id: pid, source: "private", comparative: Boolean(p.paragraphsB), title: p.title ?? `Passage ${pi + 1}`, paragraphs: p.paragraphs, paragraphsB: p.paragraphsB ?? null, wordCount: [...p.paragraphs, ...(p.paragraphsB ?? [])].join(" ").split(/\s+/).length });
        p.questions.forEach((q, qi) => {
          const qid = `${pid}-q${qi + 1}`;
          ids.push(qid);
          qRows.push({ id: qid, source: "private", section: "RC", type: q.type ?? "unclassified", logicTags: [], difficulty: q.difficulty ?? 2, passageId: pid, stem: q.stem, choices: q.choices, answer: q.answer, explanations: expl(q) });
        });
      });
      sections.push({ kind: "RC", scored: s.scored, minutes: s.minutes, questionIds: ids, passageIds: pids });
    }
  });
  if (pRows.length) await db.insert(schema.passages).values(pRows);
  for (let i = 0; i < qRows.length; i += 200) await db.insert(schema.questions).values(qRows.slice(i, i + 200));
  const nQuestions = sections.filter((s) => s.scored).reduce((a, s) => a + s.questionIds.length, 0);
  await db.insert(schema.customTests).values({ id, title: t.title, sections, nQuestions });
  return { id, nQuestions };
}

export async function listCustomTests() {
  const db = await getDb();
  const tests = await db.select().from(schema.customTests).orderBy(desc(schema.customTests.createdAt));
  const sessions = await db.select({ settings: schema.sessions.settings, scaled: schema.sessions.scoreScaled, finishedAt: schema.sessions.finishedAt }).from(schema.sessions).where(eq(schema.sessions.kind, "pt"));
  return tests.map((t) => {
    const taken = sessions.filter((s) => (s.settings as { customTestId?: string } | null)?.customTestId === t.id && s.finishedAt);
    return { ...t, attempts: taken.length, lastScaled: taken.length ? taken[taken.length - 1].scaled : null };
  });
}

export async function getCustomTest(id: string) {
  const db = await getDb();
  const [t] = await db.select().from(schema.customTests).where(eq(schema.customTests.id, id));
  return t ?? null;
}

/** Starts a practice-test session over an uploaded test, in the same shape the PT runner uses. */
export async function startCustomTest(id: string): Promise<PtBuild | null> {
  const db = await getDb();
  const t = await getCustomTest(id);
  if (!t) return null;
  const allQ = t.sections.flatMap((s) => s.questionIds);
  const allP = t.sections.flatMap((s) => s.passageIds ?? []);
  const qs = await db.select().from(schema.questions).where(inArray(schema.questions.id, allQ));
  const ps = allP.length ? await db.select().from(schema.passages).where(inArray(schema.passages.id, allP)) : [];
  const qById = new Map(qs.map((q) => [q.id, q]));
  const pById = new Map(ps.map((p) => [p.id, p]));
  const sections: PtBuild["sections"] = t.sections.map((s, i) => ({
    index: i,
    kind: s.kind,
    scored: s.scored,
    questions: s.questionIds.map((qid) => qById.get(qid)!).map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices, passageId: q.passageId })),
    passages: s.passageIds?.map((pid) => pById.get(pid)!).map((p) => ({ id: p.id, title: p.title ?? "Passage", style: p.style, topic: p.topic, comparative: p.comparative, paragraphs: p.paragraphs ?? [], paragraphsB: p.paragraphsB ?? null })),
  }));
  const specs: PtSectionSpec[] = t.sections.map((s, i) => ({ index: i, kind: s.kind, scored: s.scored, questionIds: s.questionIds, passageIds: s.passageIds }));
  const durationSec = t.sections[0].minutes * 60;
  const breakAfter = t.sections.length >= 3 ? 1 : -1;
  const sessionId = newId("pt");
  await db.insert(schema.sessions).values({ id: sessionId, kind: "pt", section: null, timed: true, durationSec: t.sections.reduce((a, s) => a + s.minutes * 60, 0), nQuestions: t.nQuestions, settings: { sections: specs, breakAfter, durationSec, customTestId: t.id, title: t.title, sectionMinutes: t.sections.map((s) => s.minutes) } });
  return { sessionId, sections, breakAfter, durationSec, sectionDurations: t.sections.map((s) => s.minutes * 60) };
}

/** Removes an uploaded test and its content. Attempts already made keep their scores; their question rows are kept if referenced. */
export async function deleteCustomTest(id: string) {
  const db = await getDb();
  const t = await getCustomTest(id);
  if (!t) return;
  await db.delete(schema.customTests).where(eq(schema.customTests.id, id));
  const qids = t.sections.flatMap((s) => s.questionIds);
  const used = new Set((await db.select({ q: schema.attempts.questionId }).from(schema.attempts).where(inArray(schema.attempts.questionId, qids))).map((r) => r.q));
  const free = qids.filter((q) => !used.has(q));
  if (free.length) await db.delete(schema.questions).where(inArray(schema.questions.id, free));
  if (!used.size) {
    const pids = t.sections.flatMap((s) => s.passageIds ?? []);
    if (pids.length) await db.delete(schema.passages).where(inArray(schema.passages.id, pids));
  }
}
