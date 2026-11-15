import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "./ids";
import { assembleSection, scoreBlindReview, type BRItem, type SectionCandidate } from "@/lib/engine/section";
import { assembleRcSection } from "./rc";
import { rawToScaled } from "@/lib/scoring/tables";
import { nextDue } from "@/lib/engine/srs";
import { guessFlag } from "@/lib/engine/guess";
import type { Difficulty } from "@/lib/content/taxonomy";

export type PtSectionKind = "LR" | "RC";
export interface PtSectionSpec {
  index: number; // 0–3
  kind: PtSectionKind;
  scored: boolean;
  questionIds: string[];
  passageIds?: string[];
  /** August-2027 format: unscored questions mixed into a scored section */
  unscoredIds?: string[];
}

export type PtFormat = "current" | "2027";
/** Questions that count toward the score: everything in scored sections except embedded unscored questions. */
export function scoredQuestionIds(specs: PtSectionSpec[]): Set<string> {
  return new Set(specs.filter((s) => s.scored).flatMap((s) => s.questionIds.filter((q) => !s.unscoredIds?.includes(q))));
}
const sample = <T,>(a: T[], k: number) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).slice(0, k).map((x) => x[1]);

export interface PtBuild {
  sessionId: string;
  sections: {
    index: number;
    kind: PtSectionKind;
    scored: boolean;
    questions: { id: string; type: string; difficulty: number; stimulus: string | null; stem: string | null; choices: Record<string, string> | null; passageId: string | null; reference?: { text: string; paragraph?: number; passage?: "A" | "B" } | null }[];
    passages?: { id: string; title: string; style: string | null; topic: string | null; comparative: boolean; paragraphs: string[]; paragraphsB: string[] | null }[];
  }[];
  breakAfter: number; // section index after which the 10-minute break happens (1)
  /** all section indexes followed by a 10-minute break (the 2027 format has two) */
  breaksAfter?: number[];
  format?: PtFormat;
  durationSec: number;
  /** per-section time limits when sections differ (uploaded tests) */
  sectionDurations?: number[];
}

async function lrCandidates(exclude: Set<string>): Promise<SectionCandidate[]> {
  const db = await getDb();
  const qs = await db
    .select({ id: schema.questions.id, type: schema.questions.type, difficulty: schema.questions.difficulty, reservedForTimed: schema.questions.reservedForTimed })
    .from(schema.questions)
    .where(and(eq(schema.questions.section, "LR"), eq(schema.questions.source, "original")));
  const seen = await db.select({ questionId: schema.attempts.questionId, last: sql<string>`max(${schema.attempts.createdAt})`, n: sql<number>`count(*)::int` }).from(schema.attempts).groupBy(schema.attempts.questionId);
  const seenMap = new Map(seen.map((s) => [s.questionId, s]));
  return qs
    .filter((q) => !exclude.has(q.id))
    .map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty as Difficulty, reservedForTimed: q.reservedForTimed, lastSeenAt: seenMap.get(q.id)?.last ?? null, timesSeen: seenMap.get(q.id)?.n ?? 0 }));
}

/** Build a 4-section PT: two scored LR, one scored RC, one unscored LR or RC in a random slot. Break after section 2. */
export async function buildPracticeTest(opts: { durationSec?: number; experimental?: "LR" | "RC" | "random"; format?: PtFormat } = {}): Promise<PtBuild | null> {
  if (opts.format === "2027") return buildPracticeTest2027();
  const db = await getDb();
  const durationSec = opts.durationSec ?? 35 * 60;
  const expKind: PtSectionKind = opts.experimental === "LR" ? "LR" : opts.experimental === "RC" ? "RC" : Math.random() < 0.5 ? "LR" : "RC";
  const kinds: PtSectionKind[] = expKind === "LR" ? ["LR", "LR", "LR", "RC"] : ["LR", "LR", "RC", "RC"];
  // shuffle section order; experimental = one of the sections of expKind chosen at random
  const order = kinds.map((k) => ({ k, r: Math.random() })).sort((a, b) => a.r - b.r).map((x) => x.k);
  const expIdx = (() => {
    const idxs = order.map((k, i) => (k === expKind ? i : -1)).filter((i) => i >= 0);
    return idxs[Math.floor(Math.random() * idxs.length)];
  })();

  const used = new Set<string>();
  const sections: PtBuild["sections"] = [];
  const specs: PtSectionSpec[] = [];
  let rcCount = 0;
  for (let i = 0; i < 4; i++) {
    const kind = order[i];
    if (kind === "LR") {
      const picked = assembleSection(await lrCandidates(used), { n: 25 + (i % 2), preferReserved: false });
      if (!picked) return null;
      picked.forEach((p) => used.add(p.id));
      const full = await db.select().from(schema.questions).where(inArray(schema.questions.id, picked.map((p) => p.id)));
      const byId = new Map(full.map((q) => [q.id, q]));
      const ordered = picked.map((p) => byId.get(p.id)!);
      sections.push({ index: i, kind, scored: i !== expIdx, questions: ordered.map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices, passageId: null })) });
      specs.push({ index: i, kind, scored: i !== expIdx, questionIds: ordered.map((q) => q.id) });
    } else {
      rcCount++;
      const sets = await assembleRcSection({ repeatAfterDays: rcCount === 1 ? 60 : 0 });
      if (!sets) return null;
      // avoid reusing passages across the two RC sections
      const chosen = sets.filter((s) => !used.has(s.passage.id)).slice(0, 4);
      if (chosen.length < 4) return null;
      chosen.forEach((s) => {
        used.add(s.passage.id);
        s.questions.forEach((q) => used.add(q.id));
      });
      sections.push({
        index: i,
        kind,
        scored: i !== expIdx,
        questions: chosen.flatMap((s) => s.questions.map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: null, stem: q.stem, choices: q.choices, passageId: q.passageId }))),
        passages: chosen.map((s) => s.passage),
      });
      specs.push({ index: i, kind, scored: i !== expIdx, questionIds: chosen.flatMap((s) => s.questions.map((q) => q.id)), passageIds: chosen.map((s) => s.passage.id) });
    }
  }
  const sessionId = newId("pt");
  await db.insert(schema.sessions).values({
    id: sessionId,
    kind: "pt",
    section: null,
    timed: true,
    durationSec: durationSec * 4,
    nQuestions: specs.filter((s) => s.scored).reduce((a, s) => a + s.questionIds.length, 0),
    settings: { sections: specs, breakAfter: 1, durationSec },
  });
  return { sessionId, sections, breakAfter: 1, durationSec };
}

/**
 * August-2027 format: Reading Comprehension (6 passages, 52 min), then two Logical Reasoning sections
 * (32 questions, 45 min each), with a 10-minute break after sections 1 and 2. There is no separate
 * unscored section: 2 of the 6 passages and 7 of each 32 LR questions are unscored, and the test
 * taker is not told which until the results.
 */
export async function buildPracticeTest2027(): Promise<PtBuild | null> {
  const db = await getDb();
  const sections: PtBuild["sections"] = [];
  const specs: PtSectionSpec[] = [];
  const sets = await assembleRcSection({ count: 6 });
  if (!sets) return null;
  const unscoredPassages = new Set(sample(sets.map((s) => s.passage.id), 2));
  sections.push({ index: 0, kind: "RC", scored: true, questions: sets.flatMap((s) => s.questions.map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: null, stem: q.stem, choices: q.choices, passageId: q.passageId }))), passages: sets.map((s) => s.passage) });
  specs.push({ index: 0, kind: "RC", scored: true, questionIds: sets.flatMap((s) => s.questions.map((q) => q.id)), passageIds: sets.map((s) => s.passage.id), unscoredIds: sets.filter((s) => unscoredPassages.has(s.passage.id)).flatMap((s) => s.questions.map((q) => q.id)) });
  const used = new Set<string>();
  for (const i of [1, 2]) {
    const picked = assembleSection(await lrCandidates(used), { n: 32, preferReserved: false });
    if (!picked) return null;
    picked.forEach((p) => used.add(p.id));
    const full = await db.select().from(schema.questions).where(inArray(schema.questions.id, picked.map((p) => p.id)));
    const byId = new Map(full.map((q) => [q.id, q]));
    const ordered = picked.map((p) => byId.get(p.id)!);
    sections.push({ index: i, kind: "LR", scored: true, questions: ordered.map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices, passageId: null })) });
    specs.push({ index: i, kind: "LR", scored: true, questionIds: ordered.map((q) => q.id), unscoredIds: sample(ordered.map((q) => q.id), 7) });
  }
  const sectionDurations = [52 * 60, 45 * 60, 45 * 60];
  const sessionId = newId("pt");
  await db.insert(schema.sessions).values({
    id: sessionId,
    kind: "pt",
    section: null,
    timed: true,
    durationSec: sectionDurations.reduce((a, b) => a + b, 0),
    nQuestions: scoredQuestionIds(specs).size,
    settings: { sections: specs, breakAfter: 0, breaksAfter: [0, 1], durationSec: sectionDurations[0], sectionMinutes: [52, 45, 45], format: "2027" },
  });
  return { sessionId, sections, breakAfter: 0, breaksAfter: [0, 1], format: "2027", durationSec: sectionDurations[0], sectionDurations };
}

export interface PtSectionAnswers {
  index: number;
  answers: { questionId: string; answer: string | null; seconds: number; flagged: boolean; changedFrom: string | null; passageSeconds?: number | null }[];
  elapsedSec: number;
}

/** Records one section's timed answers (called as each section ends). */
export async function submitPtSection(sessionId: string, sec: PtSectionAnswers) {
  const db = await getDb();
  const ids = sec.answers.map((a) => a.questionId);
  const qs = await db.select({ id: schema.questions.id, answer: schema.questions.answer }).from(schema.questions).where(inArray(schema.questions.id, ids));
  const key = new Map(qs.map((q) => [q.id, q.answer]));
  await db.insert(schema.attempts).values(
    sec.answers.map((a, i) => ({
      id: newId("att"),
      sessionId,
      questionId: a.questionId,
      mode: "pt" as const,
      position: sec.index * 100 + i,
      answer: a.answer,
      correct: a.answer == null ? null : a.answer === key.get(a.questionId),
      seconds: a.seconds,
      passageSeconds: a.passageSeconds ?? null,
      confidence: null,
      guessFlag: a.answer != null && guessFlag(a.seconds, null),
      flagged: a.flagged,
      changedFrom: a.changedFrom,
    })),
  );
  return { ok: true };
}

/** After all sections: returns flagged/blank questions (scored sections only) for blind review. */
export async function ptReviewSet(sessionId: string) {
  const db = await getDb();
  const [ses] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  const specs = (ses?.settings as { sections: PtSectionSpec[] })?.sections ?? [];
  const scoredIds = scoredQuestionIds(specs);
  const atts = await db.select().from(schema.attempts).where(and(eq(schema.attempts.sessionId, sessionId), eq(schema.attempts.mode, "pt")));
  const review = atts.filter((a) => scoredIds.has(a.questionId) && (a.flagged || a.answer == null)).map((a) => a.questionId);
  if (!review.length) return { questions: [], passages: [] };
  const qs = await db.select().from(schema.questions).where(inArray(schema.questions.id, review));
  const pids = Array.from(new Set(qs.map((q) => q.passageId).filter(Boolean))) as string[];
  const passages = pids.length ? await db.select().from(schema.passages).where(inArray(schema.passages.id, pids)) : [];
  const byId = new Map(qs.map((q) => [q.id, q]));
  return {
    questions: review.map((id) => byId.get(id)!).map((q) => ({ id: q.id, type: q.type, difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices, passageId: q.passageId })),
    passages: passages.map((p) => ({ id: p.id, title: p.title ?? "Passage", style: p.style, topic: p.topic, comparative: p.comparative, paragraphs: p.paragraphs ?? [], paragraphsB: p.paragraphsB ?? null })),
  };
}

/** Finalize: BR answers → scores (scored sections only), per-section breakdown, inbox entries. */
export async function finalizePt(sessionId: string, brAnswers: Record<string, string>) {
  const db = await getDb();
  const [ses] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  if (!ses) throw new Error("session not found");
  const specs = (ses.settings as { sections: PtSectionSpec[] }).sections;
  const atts = await db.select().from(schema.attempts).where(and(eq(schema.attempts.sessionId, sessionId), eq(schema.attempts.mode, "pt"))).orderBy(schema.attempts.position);
  const qs = await db.select({ id: schema.questions.id, answer: schema.questions.answer, type: schema.questions.type, section: schema.questions.section }).from(schema.questions).where(inArray(schema.questions.id, atts.map((a) => a.questionId)));
  const key = new Map(qs.map((q) => [q.id, q]));
  const scoredIds = scoredQuestionIds(specs);

  const items: BRItem[] = atts.filter((a) => scoredIds.has(a.questionId)).map((a) => ({ questionId: a.questionId, key: key.get(a.questionId)?.answer ?? null, timedAnswer: a.answer, flagged: a.flagged, brAnswer: brAnswers[a.questionId] ?? null }));
  const summary = scoreBlindReview(items);
  const total = items.length;
  const timedScaled = rawToScaled(summary.timedRaw, total);
  const brScaled = rawToScaled(summary.brRaw, total);

  for (const a of atts) {
    const it = summary.items.find((i) => i.questionId === a.questionId);
    if (!it) continue; // unscored question: recorded, not scored, not reviewed
    await db.update(schema.attempts).set({ brAnswer: it.brFinal, brCorrect: it.brCorrect }).where(eq(schema.attempts.id, a.id));
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
  await db.update(schema.sessions).set({ scoreRaw: summary.timedRaw, scoreScaled: timedScaled, brRaw: summary.brRaw, brScaled, finishedAt: new Date(), nQuestions: total }).where(eq(schema.sessions.id, sessionId));

  const perSection = specs.map((s) => {
    const all = atts.filter((a) => s.questionIds.includes(a.questionId));
    // with embedded unscored questions, the section line reports the scored questions only
    const sa = s.unscoredIds?.length ? all.filter((a) => scoredIds.has(a.questionId)) : all;
    const correct = sa.filter((a) => a.correct).length;
    const br = sa.filter((a) => summary.items.find((i) => i.questionId === a.questionId)?.brCorrect).length;
    const un = all.filter((a) => s.unscoredIds?.includes(a.questionId));
    return { index: s.index, kind: s.kind, scored: s.scored, n: sa.length, correct, br, unscored: un.length, unscoredCorrect: un.filter((a) => a.correct).length, seconds: Math.round(all.reduce((a, x) => a + (x.seconds ?? 0), 0)) };
  });
  return { ...summary, total, timedScaled, brScaled, perSection };
}
