import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { submitAttempt, type SubmitInput } from "@/lib/data/drill";
import { getDb, schema } from "@/lib/db/client";
import { newId } from "@/lib/data/ids";

/** Receives attempts recorded offline; one drill session per sync batch. */
export async function POST(req: Request) {
  const body = (await req.json()) as { attempts: (Omit<SubmitInput, "sessionId"> & { clientId: string })[] };
  if (!Array.isArray(body.attempts) || !body.attempts.length) return NextResponse.json({ synced: [] });
  const db = await getDb();
  const sessionId = newId("drl");
  await db.insert(schema.sessions).values({ id: sessionId, kind: "drill", section: "LR", timed: false, nQuestions: body.attempts.length, settings: { offline: true }, finishedAt: new Date() });
  const synced: string[] = [];
  let correct = 0;
  for (const a of body.attempts) {
    try {
      const r = await submitAttempt({ ...a, sessionId, mode: "drill" });
      if (r.correct) correct++;
      synced.push(a.clientId);
    } catch {
      /* skip bad rows; they stay queued client-side */
    }
  }
  await db.update(schema.sessions).set({ scoreRaw: correct }).where(eq(schema.sessions.id, sessionId));
  return NextResponse.json({ synced, sessionId });
}
