import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/auth/server";

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signin", new URL(req.url).origin));
}
