import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/dev/seed";

/** Test/demo-only: seeds six weeks of study history. Enabled only when APEX_E2E=1 or APEX_DEMO=1. */
export async function POST(req: Request) {
  if (process.env.APEX_E2E !== "1" && process.env.APEX_DEMO !== "1") return NextResponse.json({ error: "disabled" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { weeks?: number; seed?: number };
  return NextResponse.json(await seedDemo(body));
}
