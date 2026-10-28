import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/auth/server";
import { emailAllowed } from "@/lib/auth/config";

/** Magic-link landing: exchange the code for a session, then enforce the allowlist. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const supabase = await supabaseServer();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !emailAllowed(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/signin?denied=1", url.origin));
  }
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url.origin));
}
