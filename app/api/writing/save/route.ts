import { NextResponse } from "next/server";
import { saveWriting, type WritingSave } from "@/lib/data/writing";
import { setLessonProgress } from "@/lib/data/lessons";

export async function POST(req: Request) {
  const body = (await req.json()) as WritingSave;
  if (!body.promptId || typeof body.essay !== "string") return NextResponse.json({ error: "promptId and essay required" }, { status: 400 });
  const r = await saveWriting(body);
  if (body.lessonId && r.words >= 150) await setLessonProgress(body.lessonId, { status: "complete", checkScore: 1, checkTotal: 1 });
  return NextResponse.json(r);
}
