import { NextResponse } from "next/server";
import { ptReviewSet } from "@/lib/data/pt";

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as { sessionId: string };
  return NextResponse.json(await ptReviewSet(sessionId));
}
