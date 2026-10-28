import { NextResponse } from "next/server";
import { submitPtSection, type PtSectionAnswers } from "@/lib/data/pt";

export async function POST(req: Request) {
  const { sessionId, section } = (await req.json()) as { sessionId: string; section: PtSectionAnswers };
  return NextResponse.json(await submitPtSection(sessionId, section));
}
