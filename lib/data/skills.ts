import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { RATING_DEFAULT, updateRating } from "@/lib/engine/rating";
import type { Difficulty, Section } from "@/lib/content/taxonomy";

export type Dimension = "section" | "type" | "tag" | "rc_style" | "rc_qtype";

export async function getSkill(dimension: Dimension, key: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.skills)
    .where(and(eq(schema.skills.dimension, dimension), eq(schema.skills.key, key)));
  return rows[0] ?? { dimension, key, rating: RATING_DEFAULT, n: 0, correct: 0, updatedAt: new Date() };
}

export async function getAllSkills() {
  const db = await getDb();
  return db.select().from(schema.skills);
}

/** Apply one observation to every relevant dimension (section, type, tags, rc style). */
export async function recordObservation(opts: {
  section: Section;
  type: string;
  logicTags: string[];
  rcStyle?: string | null;
  difficulty: Difficulty;
  correct: boolean;
}) {
  const db = await getDb();
  const targets: [Dimension, string][] = [
    ["section", opts.section],
    [opts.section === "RC" ? "rc_qtype" : "type", opts.type],
    ...opts.logicTags.map((t) => ["tag", t] as [Dimension, string]),
  ];
  if (opts.rcStyle) targets.push(["rc_style", opts.rcStyle]);
  for (const [dimension, key] of targets) {
    const cur = await getSkill(dimension, key);
    const next = updateRating({ rating: cur.rating, n: cur.n, correct: cur.correct }, opts.difficulty, opts.correct);
    await db
      .insert(schema.skills)
      .values({ dimension, key, rating: next.rating, n: next.n, correct: next.correct, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [schema.skills.dimension, schema.skills.key],
        set: { rating: next.rating, n: next.n, correct: next.correct, updatedAt: new Date() },
      });
  }
}
