import { NextResponse } from "next/server";
import { finalizePt } from "@/lib/data/pt";

export async function POST(req: Request) {
  const { sessionId, brAnswers } = (await req.json()) as { sessionId: string; brAnswers: Record<string, string> };
  return NextResponse.json(await finalizePt(sessionId, brAnswers));
}
