import { NextResponse } from "next/server";
import { DEFAULT_DRILL_SETTINGS, pickNext, type DrillSettings } from "@/lib/data/drill";

/** Returns the next question WITHOUT the answer key or explanations. */
export async function POST(req: Request) {
  const body = (await req.json()) as { settings: Partial<DrillSettings>; excludeIds?: string[]; lastType?: string | null };
  const settings: DrillSettings = { ...DEFAULT_DRILL_SETTINGS, ...body.settings };
  const q = await pickNext(settings, body.excludeIds ?? [], body.lastType ?? null);
  if (!q) return NextResponse.json({ question: null });
  const { answer: _a, explanations: _e, keyTakeaway: _k, trapPatterns: _t, ...safe } = q; // eslint-disable-line @typescript-eslint/no-unused-vars
  return NextResponse.json({ question: safe });
}
