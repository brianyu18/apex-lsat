import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Curated check pools: for lessons whose skill is narrower than a question
 * type or tag, the question ids that test that lesson's skill. The five-question
 * check draws from the pool instead of the whole type, so lessons in a series
 * (Conditional 1, 2, 3) each test what they taught.
 */
let cache: Record<string, string[]> | null = null;

export async function readCheckPools(): Promise<Record<string, string[]>> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "content", "lessons", "check-pools.json");
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as {
      pools: Record<string, { ids: string[] }>;
    };
    cache = Object.fromEntries(Object.entries(raw.pools).map(([k, v]) => [k, v.ids]));
  } catch {
    cache = {};
  }
  return cache;
}

export async function checkPoolFor(lessonId: string): Promise<string[] | null> {
  const pools = await readCheckPools();
  return pools[lessonId]?.length ? pools[lessonId] : null;
}

let quizCache: Record<string, import("./schema").LessonQuizQuestion[]> | null = null;

/** The five-question quiz for a lesson whose check tests the lesson itself (checkMode: quiz). */
export async function lessonQuiz(lessonId: string) {
  if (!quizCache) {
    const { LessonQuizzesSchema } = await import("./schema");
    const raw = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "content", "lessons", "quizzes.json"), "utf8"),
    );
    quizCache = LessonQuizzesSchema.parse(raw);
  }
  return quizCache[lessonId] ?? null;
}
