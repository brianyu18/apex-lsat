import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "./ids";
import type { Outline } from "@/components/writing/outline-builder";

export interface WritingSave {
  promptId: string;
  outline: Outline;
  essay: string;
  prewriteSec: number;
  writeSec: number;
  lessonId?: string | null;
}

/** Persists a timed essay as a `writing` session; the content lives in settings jsonb. */
export async function saveWriting(input: WritingSave) {
  const db = await getDb();
  const id = newId("wrt");
  const words = input.essay.trim().split(/\s+/).filter(Boolean).length;
  await db.insert(schema.sessions).values({
    id,
    kind: "writing",
    section: null,
    timed: true,
    durationSec: 50 * 60,
    elapsedSec: input.prewriteSec + input.writeSec,
    nQuestions: 1,
    scoreRaw: null,
    finishedAt: new Date(),
    settings: { promptId: input.promptId, outline: input.outline, essay: input.essay, prewriteSec: input.prewriteSec, writeSec: input.writeSec, words, lessonId: input.lessonId ?? null },
  });
  return { id, words };
}

export async function recentWriting(limit = 10) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.kind, "writing"), isNotNull(schema.sessions.finishedAt)))
    .orderBy(desc(schema.sessions.startedAt))
    .limit(limit);
  return rows.map((r) => {
    const s = (r.settings ?? {}) as { promptId?: string; words?: number; prewriteSec?: number; writeSec?: number; essay?: string; outline?: Outline };
    return { id: r.id, startedAt: r.startedAt, promptId: s.promptId ?? "", words: s.words ?? 0, prewriteSec: s.prewriteSec ?? 0, writeSec: s.writeSec ?? 0, essay: s.essay ?? "", outline: s.outline };
  });
}
