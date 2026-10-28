/**
 * One-command cloud setup from your laptop (idempotent):
 *   pnpm cloud:setup
 * - runs Drizzle migrations on DATABASE_URL_DIRECT (falls back to DATABASE_URL)
 * - locks the public API roles out of every table (RLS + revoke)
 * - loads lessons + question bank
 */
import "dotenv/config";
import { sql } from "drizzle-orm";

const direct = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!direct) {
  console.error("Set DATABASE_URL (and optionally DATABASE_URL_DIRECT) in .env.local first — see docs/deploy.md");
  process.exit(1);
}
process.env.DATABASE_URL = direct;
const { getDb } = await import("@/lib/db/client");
const { runMigrations } = await import("@/lib/db/migrate");
const { loadAll } = await import("@/lib/content/load");

const db = await getDb();
await runMigrations(db);
console.log("migrations: up to date");
await db.execute(sql`
  DO $$ DECLARE t text; BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
  END $$;`);
await db.execute(sql`DROP POLICY IF EXISTS tmp_load_passages ON public.passages`);
await db.execute(sql`DROP POLICY IF EXISTS tmp_load_questions ON public.questions`);
await db.execute(sql`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`);
await db.execute(sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`);
console.log("security: RLS on, public API roles revoked");
const report = await loadAll();
console.log(`content: ${report.lrQuestions} LR · ${report.rcPassages} RC passages (${report.rcQuestions} Qs) · ${report.lessons} lessons${report.errors.length ? ` · ${report.errors.length} file(s) skipped` : ""}`);
process.exit(0);
