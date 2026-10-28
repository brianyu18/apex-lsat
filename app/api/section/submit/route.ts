import { NextResponse } from "next/server";
import { getQuestionsForReview, submitTimedSection, type TimedAnswer } from "@/lib/data/sections";

export async function POST(req: Request) {
  const { sessionId, answers, elapsedSec } = (await req.json()) as { sessionId: string; answers: TimedAnswer[]; elapsedSec: number };
  const r = await submitTimedSection(sessionId, answers, elapsedSec);
  const review = await getQuestionsForReview(r.toReview);
  return NextResponse.json({ ...r, reviewQuestions: review.questions, reviewPassages: review.passages });
}
