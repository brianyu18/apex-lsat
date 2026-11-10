import { NextResponse } from "next/server";
import { buildPracticeTest } from "@/lib/data/pt";
import { startCustomTest } from "@/lib/data/custom";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { durationSec?: number; experimental?: "LR" | "RC" | "random"; customTestId?: string };
  if (body.customTestId) {
    const c = await startCustomTest(body.customTestId);
    return c ? NextResponse.json(c) : NextResponse.json({ error: "Test not found." }, { status: 404 });
  }
  const r = await buildPracticeTest(body);
  if (!r) return NextResponse.json({ error: "Not enough fresh questions/passages to build a full test yet." }, { status: 409 });
  return NextResponse.json(r);
}
