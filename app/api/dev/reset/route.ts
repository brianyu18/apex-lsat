import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db/client";

/** Test-only: wipes user state. Enabled only when APEX_E2E=1. */
export async function POST() {
  if (process.env.APEX_E2E !== "1") return NextResponse.json({ error: "disabled" }, { status: 404 });
  const db = await getDb();
  await db.delete(schema.planDays);
  await db.delete(schema.plan);
  await db.delete(schema.misses);
  await db.delete(schema.attempts);
  await db.delete(schema.sessions);
  await db.delete(schema.skills);
  await db.delete(schema.lessonsProgress);
  await db.delete(schema.settings);
  return NextResponse.json({ ok: true });
}
