import { afterEach, describe, expect, it } from "vitest";
import { authEnabled, emailAllowed } from "@/lib/auth/config";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe("auth gate", () => {
  it("is off without Supabase env and in e2e", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(authEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "k";
    process.env.APEX_E2E = "1";
    expect(authEnabled()).toBe(false);
    delete process.env.APEX_E2E;
    expect(authEnabled()).toBe(true);
  });
  it("allowlist is exact, case-insensitive, and denies everything when empty", () => {
    process.env.APEX_ALLOWED_EMAILS = "Me@Example.com, other@example.com";
    expect(emailAllowed("me@example.com")).toBe(true);
    expect(emailAllowed("ME@EXAMPLE.COM")).toBe(true);
    expect(emailAllowed("stranger@example.com")).toBe(false);
    expect(emailAllowed(null)).toBe(false);
    process.env.APEX_ALLOWED_EMAILS = "";
    expect(emailAllowed("me@example.com")).toBe(false);
  });
});
