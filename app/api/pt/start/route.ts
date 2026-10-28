import { NextResponse } from "next/server";
import { buildPracticeTest } from "@/lib/data/pt";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { durationSec?: number; experimental?: "LR" | "RC" | "random" };
  const r = await buildPracticeTest(body);
  if (!r) return NextResponse.json({ error: "Not enough fresh questions/passages to build a full test yet." }, { status: 409 });
  return NextResponse.json(r);
}
