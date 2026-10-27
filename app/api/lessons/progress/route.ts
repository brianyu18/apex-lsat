import { NextResponse } from "next/server";
import { setLessonProgress } from "@/lib/data/lessons";

export async function POST(req: Request) {
  const { lessonId, score, total } = (await req.json()) as { lessonId: string; score: number; total: number };
  const complete = total > 0 && score >= Math.min(4, total);
  await setLessonProgress(lessonId, { status: complete ? "complete" : "in_progress", checkScore: score, checkTotal: total });
  return NextResponse.json({ complete });
}
