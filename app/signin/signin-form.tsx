"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

/** Password sign-in when a password has been set (Account page); otherwise a one-time email link. */
export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return void sendLink();
    setBusy("password");
    setError(null);
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    if (error) return setError(error.message === "Invalid login credentials" ? "Wrong email or password. If you haven't set a password yet, use the email link below." : error.message);
    window.location.assign(next.startsWith("/") ? next : "/");
  }
  async function sendLink() {
    setBusy("link");
    setError(null);
    const { error } = await client().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setBusy(null);
    if (error) return setError(/rate limit/i.test(error.message) ? "Too many emails requested. Wait about an hour, or sign in with your password." : error.message);
    window.location.assign("/signin?sent=1");
  }
  return (
    <form onSubmit={withPassword} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy !== null || !email || !password} className="w-full">
        {busy === "password" ? "Signing in…" : "Sign in"}
      </Button>
      <Button type="button" variant="outline" disabled={busy !== null || !email} onClick={() => void sendLink()} className="w-full">
        {busy === "link" ? "Sending…" : "Email me a sign-in link instead"}
      </Button>
      <p className="text-xs text-ink-3">First time, or forgot your password? Use the email link, then set a password under Account.</p>
    </form>
  );
}
