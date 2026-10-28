import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { getSkill } from "./skills";
import { skillLevel } from "@/lib/engine/rating";
import type { Difficulty, RCStyle, RCTopic } from "@/lib/content/taxonomy";

export interface RcPickSettings {
  styles: RCStyle[] | null;
  topics: RCTopic[] | null;
  comparative: boolean | null; // null = either
  qtypes: string[] | null; // restrict to passages that have ≥1 question of these types
  repeatAfterDays: number;
  excludePassageIds: string[];
}

export const DEFAULT_RC_PICK: RcPickSettings = { styles: null, topics: null, comparative: null, qtypes: null, repeatAfterDays: 45, excludePassageIds: [] };

/** Picks one passage near the student's RC level (by mean question difficulty), least-seen first. */
export async function pickPassage(settings: RcPickSettings) {
  const db = await getDb();
  const skill = await getSkill("section", "RC");
  const level = skillLevel(skill.rating);
  const passages = await db.select().from(schema.passages).where(eq(schema.passages.source, "original"));
  const qs = await db
    .select({ id: schema.questions.id, passageId: schema.questions.passageId, type: schema.questions.type, difficulty: schema.questions.difficulty })
    .from(schema.questions)
    .where(and(eq(schema.questions.section, "RC"), eq(schema.questions.source, "original")));
  const seen = await db
    .select({ questionId: schema.attempts.questionId, last: sql<string>`max(${schema.attempts.createdAt})` })
    .from(schema.attempts)
    .groupBy(schema.attempts.questionId);
  const lastByQ = new Map(seen.map((s) => [s.questionId, new Date(s.last).getTime()]));
  const cutoff = Date.now() - settings.repeatAfterDays * 86400000;
  const exclude = new Set(settings.excludePassageIds);

  const scored = passages
    .filter((p) => !exclude.has(p.id))
    .filter((p) => !settings.styles || settings.styles.includes(p.style as RCStyle))
    .filter((p) => !settings.topics || settings.topics.includes(p.topic as RCTopic))
    .filter((p) => settings.comparative == null || p.comparative === settings.comparative)
    .map((p) => {
      const pq = qs.filter((q) => q.passageId === p.id);
      const meanDiff = pq.length ? pq.reduce((a, q) => a + q.difficulty, 0) / pq.length : 2.5;
      const lastSeen = Math.max(0, ...pq.map((q) => lastByQ.get(q.id) ?? 0));
      const hasType = !settings.qtypes || pq.some((q) => settings.qtypes!.includes(q.type));
      return { p, pq, meanDiff, lastSeen, hasType };
    })
    .filter((x) => x.pq.length >= 5 && x.hasType);
  if (!scored.length) return null;
  const fresh = scored.filter((x) => x.lastSeen < cutoff);
  const pool = fresh.length ? fresh : scored;
  // closest mean difficulty to (level + 0.3), then least recently seen, with a little randomness
  pool.sort((a, b) => Math.abs(a.meanDiff - (level + 0.3)) + Math.random() * 0.4 - (Math.abs(b.meanDiff - (level + 0.3)) + Math.random() * 0.4) || a.lastSeen - b.lastSeen);
  const pick = pool[0];
  const full = await db.select().from(schema.questions).where(inArray(schema.questions.id, pick.pq.map((q) => q.id)));
  const order = full.sort((a, b) => (a.id < b.id ? -1 : 1)); // q1..qn by id suffix
  return {
    passage: {
      id: pick.p.id,
      title: pick.p.title ?? "Passage",
      style: pick.p.style,
      topic: pick.p.topic,
      comparative: pick.p.comparative,
      paragraphs: pick.p.paragraphs ?? [],
      paragraphsB: pick.p.paragraphsB ?? null,
      wordCount: pick.p.wordCount,
    },
    questions: order.map((q) => ({
      id: q.id,
      section: q.section,
      type: q.type,
      logicTags: q.logicTags,
      difficulty: q.difficulty as Difficulty,
      stimulus: null,
      stem: q.stem,
      choices: q.choices,
      predictionHint: q.predictionHint,
      passageId: q.passageId,
    })),
  };
}

export async function getPassage(id: string) {
  const db = await getDb();
  const [p] = await db.select().from(schema.passages).where(eq(schema.passages.id, id));
  return p ?? null;
}

export async function rcBankStats() {
  const db = await getDb();
  const rows = await db
    .select({ style: schema.passages.style, topic: schema.passages.topic, comparative: schema.passages.comparative, n: sql<number>`count(*)::int` })
    .from(schema.passages)
    .where(eq(schema.passages.source, "original"))
    .groupBy(schema.passages.style, schema.passages.topic, schema.passages.comparative);
  const [q] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.questions).where(and(eq(schema.questions.section, "RC"), eq(schema.questions.source, "original")));
  return { groups: rows, passages: rows.reduce((a, r) => a + r.n, 0), questions: q?.n ?? 0 };
}

/** Assemble an RC section: 4 passages (3 single + 1 comparative when available), 26–28 questions. */
export async function assembleRcSection(opts: { repeatAfterDays?: number } = {}) {
  const db = await getDb();
  const passages = await db.select().from(schema.passages).where(eq(schema.passages.source, "original"));
  const qs = await db.select().from(schema.questions).where(and(eq(schema.questions.section, "RC"), eq(schema.questions.source, "original")));
  const seen = await db.select({ questionId: schema.attempts.questionId, last: sql<string>`max(${schema.attempts.createdAt})` }).from(schema.attempts).groupBy(schema.attempts.questionId);
  const lastByQ = new Map(seen.map((s) => [s.questionId, new Date(s.last).getTime()]));
  const cutoff = Date.now() - (opts.repeatAfterDays ?? 60) * 86400000;
  const byP = new Map<string, typeof qs>();
  for (const q of qs) if (q.passageId) byP.set(q.passageId, [...(byP.get(q.passageId) ?? []), q]);
  const usable = passages
    .map((p) => ({ p, pq: (byP.get(p.id) ?? []).sort((a, b) => (a.id < b.id ? -1 : 1)) }))
    .filter((x) => x.pq.length >= 5)
    .map((x) => ({ ...x, lastSeen: Math.max(0, ...x.pq.map((q) => lastByQ.get(q.id) ?? 0)) }));
  let pool = usable.filter((x) => x.lastSeen < cutoff);
  if (pool.length < 4) pool = usable;
  if (pool.length < 4) return null;
  const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const comps = shuffle(pool.filter((x) => x.p.comparative));
  const singles = shuffle(pool.filter((x) => !x.p.comparative));
  const chosen = [] as typeof pool;
  if (comps.length) chosen.push(comps[0]);
  for (const s of singles) {
    if (chosen.length >= 4) break;
    chosen.push(s);
  }
  while (chosen.length < 4 && comps.length > chosen.filter((c) => c.p.comparative).length) chosen.push(comps[chosen.filter((c) => c.p.comparative).length]);
  if (chosen.length < 4) return null;
  // order: easier passages first, comparative third or fourth (as on the real test)
  const meanD = (x: (typeof chosen)[number]) => x.pq.reduce((a, q) => a + q.difficulty, 0) / x.pq.length;
  const singlesSorted = chosen.filter((c) => !c.p.comparative).sort((a, b) => meanD(a) - meanD(b));
  const comp = chosen.find((c) => c.p.comparative);
  const ordered = comp ? [...singlesSorted.slice(0, 2), comp, ...singlesSorted.slice(2)] : singlesSorted;
  return ordered.slice(0, 4).map((x) => ({
    passage: { id: x.p.id, title: x.p.title ?? "Passage", style: x.p.style, topic: x.p.topic, comparative: x.p.comparative, paragraphs: x.p.paragraphs ?? [], paragraphsB: x.p.paragraphsB ?? null },
    questions: x.pq.map((q) => ({ id: q.id, section: q.section, type: q.type, logicTags: q.logicTags, difficulty: q.difficulty as Difficulty, stimulus: null, stem: q.stem, choices: q.choices, passageId: q.passageId })),
  }));
}
