import { NextResponse } from "next/server";
import { submitAttempt, type SubmitInput } from "@/lib/data/drill";

export async function POST(req: Request) {
  const body = (await req.json()) as SubmitInput;
  const r = await submitAttempt(body);
  return NextResponse.json({
    attemptId: r.attemptId,
    correct: r.correct,
    guessFlag: r.guessFlag,
    answer: r.question.answer,
    explanations: r.question.explanations,
    keyTakeaway: r.question.keyTakeaway,
    trapPatterns: r.question.trapPatterns,
  });
}
