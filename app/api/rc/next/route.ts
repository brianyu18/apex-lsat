import { NextResponse } from "next/server";
import { DEFAULT_RC_PICK, pickPassage, type RcPickSettings } from "@/lib/data/rc";

export async function POST(req: Request) {
  const body = (await req.json()) as { settings?: Partial<RcPickSettings>; excludePassageIds?: string[] };
  const r = await pickPassage({ ...DEFAULT_RC_PICK, ...(body.settings ?? {}), excludePassageIds: body.excludePassageIds ?? [] });
  if (!r) return NextResponse.json({ passage: null, questions: [] });
  return NextResponse.json(r);
}
