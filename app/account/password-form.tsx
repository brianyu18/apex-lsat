"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

const MIN = 10;

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    if (password.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (password !== again) return setError("The two entries don't match.");
    setBusy(true);
    setError(null);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setPassword("");
    setAgain("");
    setDone(true);
  }
  return (
    <form onSubmit={submit} className="mt-4 max-w-sm space-y-3">
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="new-password-again">Repeat it</Label>
        <Input id="new-password-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {done && <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">Password saved. You can sign in with it from now on.</p>}
      <Button type="submit" disabled={busy || !password || !again}>
        {busy ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
