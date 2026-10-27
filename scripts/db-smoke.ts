import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

const db = await getDb();
await db.insert(schema.settings).values({ id: 1, goalScore: 175 }).onConflictDoNothing();
await db
  .insert(schema.questions)
  .values({ id: "smoke-1", section: "LR", type: "flaw", difficulty: 2, source: "original", stimulus: "x", stem: "y", choices: { A: "a", B: "b", C: "c", D: "d", E: "e" }, answer: "A" })
  .onConflictDoNothing();
const rows = await db.select().from(schema.questions).where(eq(schema.questions.id, "smoke-1"));
console.log("questions:", rows.length, rows[0]?.type);
await db.delete(schema.questions).where(eq(schema.questions.id, "smoke-1"));
process.exit(0);
