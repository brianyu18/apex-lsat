import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { readLessons, type LessonMeta } from "@/lib/content/load";

export const UNIT_TITLES: Record<number, { title: string; blurb: string }> = {
  0: { title: "Start here", blurb: "How the test works, how this program works, and how to study so it sticks." },
  1: { title: "Foundations", blurb: "Arguments, translation, conditional logic, quantifiers, formal flaws, causation." },
  2: { title: "Logical Reasoning by type", blurb: "Every question type, taught in pairs, in order of how often they appear." },
  3: { title: "Logic tags", blurb: "The reasoning patterns that cut across types — where the hard points live." },
  4: { title: "Reading Comprehension", blurb: "Passage styles, low-resolution summaries, viewpoint tracking, question types." },
  5: { title: "Timing & test craft", blurb: "Pacing checkpoints, skipping, confidence, test-day protocol." },
  6: { title: "Argumentative Writing", blurb: "The 50-minute essay: prewrite, structure, timed practice." },
};

export async function getLessonsWithProgress() {
  const { lessons, errors } = await readLessons();
  const db = await getDb();
  const progress = await db.select().from(schema.lessonsProgress);
  const pmap = new Map(progress.map((p) => [p.lessonId, p]));
  return {
    errors,
    lessons: lessons.map((l) => ({ ...l, progress: pmap.get(l.id) ?? null })),
  };
}

export async function getLesson(id: string): Promise<(LessonMeta & { prev: LessonMeta | null; next: LessonMeta | null }) | null> {
  const { lessons } = await readLessons();
  const i = lessons.findIndex((l) => l.id === id);
  if (i === -1) return null;
  return { ...lessons[i], prev: lessons[i - 1] ?? null, next: lessons[i + 1] ?? null };
}

export async function getLessonProgress(id: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.lessonsProgress).where(eq(schema.lessonsProgress.lessonId, id));
  return rows[0] ?? null;
}

export async function setLessonProgress(id: string, patch: { status?: "not_started" | "in_progress" | "complete"; checkScore?: number; checkTotal?: number }) {
  const db = await getDb();
  const complete = patch.status === "complete";
  await db
    .insert(schema.lessonsProgress)
    .values({ lessonId: id, status: patch.status ?? "in_progress", checkScore: patch.checkScore, checkTotal: patch.checkTotal, completedAt: complete ? new Date() : null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.lessonsProgress.lessonId,
      set: { ...(patch.status ? { status: patch.status } : {}), ...(patch.checkScore != null ? { checkScore: patch.checkScore, checkTotal: patch.checkTotal } : {}), ...(complete ? { completedAt: new Date() } : {}), updatedAt: new Date() },
    });
}
