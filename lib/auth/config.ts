/** The sign-in gate is on only when Supabase Auth env vars are present (cloud). Local/e2e runs are open. */
export function authEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && process.env.APEX_E2E !== "1";
}
export function allowedEmails(): string[] {
  return (process.env.APEX_ALLOWED_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export function emailAllowed(email: string | null | undefined) {
  if (!email) return false;
  const list = allowedEmails();
  return list.length === 0 ? false : list.includes(email.toLowerCase());
}
