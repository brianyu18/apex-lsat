import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

type SectionSpec = { index: number; kind: "LR" | "RC"; scored: boolean; unscoredIds?: string[] };

/** A plain-language name for a session, for headings and lists. */
export function sessionLabel(s: { kind: string; section: string | null; settings: Record<string, unknown> | null }) {
  const st = s.settings ?? {};
  if (s.kind === "pt") return typeof st.title === "string" && st.title ? st.title : st.format === "2027" ? "Practice test (August 2027 format)" : "Practice test";
  if (s.kind === "section") return s.section === "RC" ? "Timed Reading Comprehension section" : "Timed Logical Reasoning section";
  if (s.kind === "skip_trainer") return "Skip trainer";
  if (s.kind === "check") return "Diagnostic check";
  return s.section === "RC" ? "Reading Comprehension drill" : "Drill";
}

/**
 * Every question answered in one session, in the order it was taken, with
 * the full question, key and explanations: the whole test for review, right
 * answers included.
 */
export async function getSessionReview(sessionId: string) {
  const db = await getDb();
  const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  if (!session) return null;
  const rows = await db
    .select({ attempt: schema.attempts, question: schema.questions })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(eq(schema.attempts.sessionId, sessionId))
    .orderBy(schema.attempts.position, schema.attempts.createdAt);
  // one row per question: the first (timed) attempt
  const seen = new Set<string>();
  const items = rows.filter((r) => (seen.has(r.question.id) ? false : (seen.add(r.question.id), true)));
  const pids = Array.from(new Set(items.map((r) => r.question.passageId).filter((x): x is string => Boolean(x))));
  const ps = pids.length ? await db.select().from(schema.passages).where(inArray(schema.passages.id, pids)) : [];
  const specs = (Array.isArray(session.settings?.sections) ? (session.settings!.sections as SectionSpec[]) : []).slice().sort((a, b) => a.index - b.index);
  const unscored = new Set(specs.flatMap((s) => (s.scored ? (s.unscoredIds ?? []) : [])));
  return {
    session,
    label: sessionLabel(session),
    sections: specs,
    items: items.map((r) => ({
      ...r,
      /** practice tests store position as section * 100 + index */
      sectionIndex: session.kind === "pt" && r.attempt.position != null ? Math.floor(r.attempt.position / 100) : 0,
      unscored: unscored.has(r.question.id),
    })),
    passages: new Map(ps.map((p) => [p.id, p])),
  };
}

/** Recent sessions that have at least one answered question, newest first. */
export async function recentReviewableSessions(limit = 12) {
  const db = await getDb();
  const counts = await db
    .select({
      sessionId: schema.attempts.sessionId,
      n: sql<number>`count(distinct ${schema.attempts.questionId})`.mapWith(Number),
      right: sql<number>`count(distinct ${schema.attempts.questionId}) filter (where ${schema.attempts.correct})`.mapWith(Number),
    })
    .from(schema.attempts)
    .innerJoin(schema.sessions, eq(schema.attempts.sessionId, schema.sessions.id))
    .where(and(inArray(schema.sessions.kind, ["section", "pt", "drill", "check", "skip_trainer"])))
    .groupBy(schema.attempts.sessionId, schema.sessions.startedAt)
    .orderBy(desc(schema.sessions.startedAt))
    .limit(limit);
  const ids = counts.map((c) => c.sessionId).filter((x): x is string => Boolean(x));
  if (!ids.length) return [];
  const ses = await db.select().from(schema.sessions).where(inArray(schema.sessions.id, ids));
  const byId = new Map(ses.map((s) => [s.id, s]));
  return counts
    .filter((c) => c.sessionId && byId.has(c.sessionId))
    .map((c) => {
      const s = byId.get(c.sessionId!)!;
      return { id: s.id, label: sessionLabel(s), kind: s.kind, startedAt: s.startedAt, n: c.n, right: c.right, scaled: s.scoreScaled };
    });
}
