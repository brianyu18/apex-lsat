import { NextResponse } from "next/server";
import { finishSession, startSession, sessionSummary, type DrillSettings } from "@/lib/data/drill";

export async function POST(req: Request) {
  const body = (await req.json()) as { settings: Partial<DrillSettings>; kind?: "drill" | "check" };
  const id = await startSession(body.kind ?? "drill", body.settings ?? {});
  return NextResponse.json({ sessionId: id });
}

export async function PATCH(req: Request) {
  const { sessionId } = (await req.json()) as { sessionId: string };
  await finishSession(sessionId);
  const summary = await sessionSummary(sessionId);
  return NextResponse.json({ summary });
}
