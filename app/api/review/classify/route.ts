import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { nextDue } from "@/lib/engine/srs";

const TYPES = new Set(["misread", "logic_gap", "trap", "time_pressure", "careless", "guessed_right"]);

/** One-tap classification from the drill flow. Creates the miss row if needed; doesn't mark reviewed. */
export async function POST(req: Request) {
  const { attemptId, errorType, trapSubtype, takeaway } = (await req.json()) as { attemptId: string; errorType: string; trapSubtype?: string | null; takeaway?: string | null };
  if (!TYPES.has(errorType)) return NextResponse.json({ error: "bad errorType" }, { status: 400 });
  const db = await getDb();
  const [att] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, attemptId));
  if (!att) return NextResponse.json({ error: "not found" }, { status: 404 });
  const existing = await db.select().from(schema.misses).where(eq(schema.misses.attemptId, attemptId));
  const patch = { errorType: errorType as never, trapSubtype: trapSubtype ?? null, ...(takeaway ? { takeaway } : {}) };
  if (existing[0]) await db.update(schema.misses).set(patch).where(eq(schema.misses.attemptId, attemptId));
  else await db.insert(schema.misses).values({ attemptId, questionId: att.questionId, srsBox: 1, nextDue: nextDue(1), ...patch });
  return NextResponse.json({ ok: true });
}
