/** Restore a backup made by cloud-backup.ts into the current DATABASE_URL (or local PGlite). Upserts; never deletes. */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getDb, schema } from "@/lib/db/client";

const file = process.argv[2];
if (!file) {
  console.error("usage: pnpm cloud:restore backups/apex-YYYY-MM-DD.json");
  process.exit(1);
}
const d = JSON.parse(await readFile(file, "utf8"));
const db = await getDb();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fix = (rows: Row[], dateKeys: string[]): any[] => rows.map((r) => ({ ...r, ...Object.fromEntries(dateKeys.filter((k) => r[k]).map((k) => [k, new Date(r[k] as string)])) }));
type Row = Record<string, unknown>;
const chunk = async (rows: Row[], fn: (c: Row[]) => Promise<unknown>) => {
  for (let i = 0; i < rows.length; i += 300) await fn(rows.slice(i, i + 300));
};
if (d.settings?.length) await db.insert(schema.settings).values(fix(d.settings, ["updatedAt"])).onConflictDoNothing();
await chunk(d.officialQuestions ?? [], (c) => db.insert(schema.questions).values(fix(c, ["createdAt"])).onConflictDoNothing());
await chunk(d.plan ?? [], (c) => db.insert(schema.plan).values(fix(c, ["generatedAt"])).onConflictDoNothing());
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await chunk(d.planDays ?? [], (c) => db.insert(schema.planDays).values(c as any).onConflictDoNothing());
await chunk(d.sessions ?? [], (c) => db.insert(schema.sessions).values(fix(c, ["startedAt", "finishedAt"])).onConflictDoNothing());
await chunk(d.attempts ?? [], (c) => db.insert(schema.attempts).values(fix(c, ["createdAt"])).onConflictDoNothing());
await chunk(d.misses ?? [], (c) => db.insert(schema.misses).values(fix(c, ["reviewedAt", "createdAt"])).onConflictDoNothing());
await chunk(d.skills ?? [], (c) => db.insert(schema.skills).values(fix(c, ["updatedAt"])).onConflictDoNothing());
await chunk(d.lessonsProgress ?? [], (c) => db.insert(schema.lessonsProgress).values(fix(c, ["completedAt", "updatedAt"])).onConflictDoNothing());
console.log("restored", file);
process.exit(0);
