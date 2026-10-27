import { NextResponse } from "next/server";
import { submitBlindReview } from "@/lib/data/sections";

export async function POST(req: Request) {
  const { sessionId, brAnswers } = (await req.json()) as { sessionId: string; brAnswers: Record<string, string> };
  const r = await submitBlindReview(sessionId, brAnswers);
  return NextResponse.json(r);
}
