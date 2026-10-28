/**
 * JSON backup of your study data (not the bank): pnpm cloud:backup
 * Writes backups/apex-<date>.json. Restore with: pnpm cloud:restore backups/<file>.json
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { getDb, schema } from "@/lib/db/client";

const db = await getDb();
const dump = {
  version: 1,
  at: new Date().toISOString(),
  settings: await db.select().from(schema.settings),
  plan: await db.select().from(schema.plan),
  planDays: await db.select().from(schema.planDays),
  sessions: await db.select().from(schema.sessions),
  attempts: await db.select().from(schema.attempts),
  misses: await db.select().from(schema.misses),
  skills: await db.select().from(schema.skills),
  lessonsProgress: await db.select().from(schema.lessonsProgress),
  officialQuestions: (await db.select().from(schema.questions)).filter((q) => q.source === "official_ref"),
};
await mkdir("backups", { recursive: true });
const file = `backups/apex-${dump.at.slice(0, 10)}.json`;
await writeFile(file, JSON.stringify(dump));
console.log(`${file}: ${dump.attempts.length} attempts, ${dump.sessions.length} sessions, ${dump.misses.length} misses`);
process.exit(0);
