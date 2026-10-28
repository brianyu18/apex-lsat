import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { authEnabled, emailAllowed } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/auth/server";
import { SignInForm } from "./signin-form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string; sent?: string; error?: string }> }) {
  const sp = await searchParams;
  if (!authEnabled()) redirect("/");
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && emailAllowed(user.email)) redirect(sp.next && sp.next.startsWith("/") ? sp.next : "/");
  return (
    <div className="mx-auto max-w-md pt-10">
      <Card>
        <CardTitle>Apex LSAT</CardTitle>
        <CardDescription>Personal study system. Sign in with the email this deployment is locked to; you&apos;ll get a one-time link.</CardDescription>
        {sp.denied && (
          <p role="alert" className="mt-3 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
            That account isn&apos;t allowed here. {user?.email ? `Signed in as ${user.email}. ` : ""}
            <a href="/auth/signout" className="underline">
              Sign out
            </a>{" "}
            and try the right email.
          </p>
        )}
        {sp.error && (
          <p role="alert" className="mt-3 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
            {sp.error}
          </p>
        )}
        {sp.sent ? <p className="mt-4 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">Check your inbox for the sign-in link. Open it on this device.</p> : <SignInForm next={sp.next ?? "/"} />}
      </Card>
    </div>
  );
}
