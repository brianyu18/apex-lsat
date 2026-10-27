import { NextResponse } from "next/server";
import { setGuessFlag } from "@/lib/data/drill";

export async function POST(req: Request) {
  const { attemptId, flag } = (await req.json()) as { attemptId: string; flag: boolean };
  await setGuessFlag(attemptId, flag);
  return NextResponse.json({ ok: true });
}
