import { Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { authEnabled } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/auth/server";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!authEnabled())
    return (
      <Card>
        <CardTitle>Account</CardTitle>
        <CardDescription>Sign-in is off for this copy of the app (it runs locally without accounts), so there is nothing to set here.</CardDescription>
      </Card>
    );
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-ink-2">Signed in as {user?.email ?? "unknown"}.</p>
      </header>
      <Card>
        <CardTitle>Password</CardTitle>
        <CardDescription>Set or change the password for signing in. With a password you no longer need an email link, including on a new device.</CardDescription>
        <PasswordForm />
      </Card>
      <a href="/auth/signout" className="text-sm text-ink-3 underline hover:text-ink">
        Sign out
      </a>
    </div>
  );
}
