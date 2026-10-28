import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Supabase server client bound to the request cookies (App Router). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        try {
          for (const { name, value, options } of all) store.set(name, value, options);
        } catch {
          /* called from a Server Component: middleware refreshes the session instead */
        }
      },
    },
  });
}
