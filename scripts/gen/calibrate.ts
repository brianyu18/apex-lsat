/**
 * Difficulty calibration from attempt data.
 *
 *   pnpm tsx scripts/gen/calibrate.ts [--apply] [--min=20]
 *
 * For every original question with ≥ min counted attempts (guesses excluded),
 * compare observed accuracy to the expected band for its level
 * (L1 85–100%, L2 70–85%, L3 50–70%, L4 20–50%). Items outside their band by
 * a full level get `difficultyCalibrated` set (and with --apply, `difficulty`
 * moved ±1 and the JSON in content/bank updated). Prints a report.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { DIFFICULTY_RUBRIC, type Difficulty } from "@/lib/content/taxonomy";

const apply = process.argv.includes("--apply");
const min = Number(process.argv.find((a) => a.startsWith("--min="))?.split("=")[1] ?? 20);

function bandFor(acc: number): Difficulty {
  for (const d of [1, 2, 3, 4] as Difficulty[]) {
    const [lo, hi] = DIFFICULTY_RUBRIC[d].expectedAccuracy;
    if (acc >= lo && acc <= hi) return d;
  }
  return acc > 0.85 ? 1 : 4;
}

const db = await getDb();
const rows = await db
  .select({
    id: schema.questions.id,
    difficulty: schema.questions.difficulty,
    n: sql<number>`count(*) filter (where ${schema.attempts.correct} is not null and not ${schema.attempts.guessFlag})::int`,
    c: sql<number>`count(*) filter (where ${schema.attempts.correct} and not ${schema.attempts.guessFlag})::int`,
  })
  .from(schema.questions)
  .innerJoin(schema.attempts, eq(schema.attempts.questionId, schema.questions.id))
  .where(eq(schema.questions.source, "original"))
  .groupBy(schema.questions.id, schema.questions.difficulty);

const changes: { id: string; from: number; to: number; acc: number; n: number }[] = [];
for (const r of rows) {
  if (r.n < min) continue;
  const acc = r.c / r.n;
  const observed = bandFor(acc);
  const to = Math.max(1, Math.min(4, r.difficulty + Math.sign(observed - r.difficulty))) as Difficulty;
  await db.update(schema.questions).set({ difficultyCalibrated: Math.round(acc * 100) / 100 }).where(eq(schema.questions.id, r.id));
  if (to !== r.difficulty) changes.push({ id: r.id, from: r.difficulty, to, acc, n: r.n });
}

console.log(`${rows.filter((r) => r.n >= min).length} items with ≥${min} counted attempts; ${changes.length} outside their band.`);
for (const c of changes) console.log(`  ${c.id}: L${c.from} → L${c.to}  (${Math.round(c.acc * 100)}% over ${c.n})`);

if (apply && changes.length) {
  const dir = path.join(process.cwd(), "content", "bank", "lr");
  const byId = new Map(changes.map((c) => [c.id, c.to]));
  for (const f of (await readdir(dir)).filter((x) => x.endsWith(".json"))) {
    const p = path.join(dir, f);
    const items = JSON.parse(await readFile(p, "utf8")) as { id: string; difficulty: number }[];
    let touched = false;
    for (const it of items) {
      const to = byId.get(it.id);
      if (to != null) {
        it.difficulty = to;
        touched = true;
      }
    }
    if (touched) await writeFile(p, JSON.stringify(items, null, 2) + "\n");
  }
  for (const c of changes) await db.update(schema.questions).set({ difficulty: c.to }).where(eq(schema.questions.id, c.id));
  console.log("Applied to content/bank and the database.");
}
process.exit(0);
