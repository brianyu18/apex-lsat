import { NextResponse } from "next/server";
import { startTimedSection } from "@/lib/data/sections";

export async function POST(req: Request) {
  const body = (await req.json()) as { section?: "LR" | "RC"; n?: number; durationSec?: number; preferReserved?: boolean };
  const r = await startTimedSection({ section: body.section ?? "LR", n: body.n ?? 25, durationSec: body.durationSec ?? 35 * 60, preferReserved: body.preferReserved ?? false });
  if (!r) return NextResponse.json({ error: "Not enough questions in the bank for a full section yet." }, { status: 409 });
  return NextResponse.json(r);
}
