import { NextResponse } from "next/server";
import { setLessonProgress } from "@/lib/data/lessons";

export async function POST(req: Request) {
  const { lessonId, score, total, threshold } = (await req.json()) as { lessonId: string; score: number; total: number; threshold?: number };
  // 5-question checks: 4 of 5. Passage-based checks: ≥ threshold (default 80%) of however many questions the passage had.
  const complete = total > 0 && (threshold != null ? score / total >= threshold : score >= Math.min(4, total));
  await setLessonProgress(lessonId, { status: complete ? "complete" : "in_progress", checkScore: score, checkTotal: total });
  return NextResponse.json({ complete });
}
