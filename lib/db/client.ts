/**
 * Database client.
 *
 * - Default: PGlite (embedded Postgres) persisted at APEX_DB_DIR (./data/apex).
 * - If DATABASE_URL is set: node-postgres against a real Postgres (e.g. Supabase).
 *
 * Both return a Drizzle instance with the same schema, so application code never
 * knows which one it is talking to.
 */
import * as schema from "./schema";
import type { PgDatabase } from "drizzle-orm/pg-core";

export type Db = PgDatabase<any, typeof schema>; // eslint-disable-line @typescript-eslint/no-explicit-any

declare global {
  var __apexDb: Promise<Db> | undefined;
}

async function create(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    return drizzle(pool, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = process.env.APEX_DB_DIR ?? "./data/apex";
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema }) as unknown as Db;
  const { runMigrations } = await import("./migrate");
  await runMigrations(db);
  return db;
}

/** Singleton across hot reloads. */
export function getDb(): Promise<Db> {
  if (!globalThis.__apexDb) globalThis.__apexDb = create();
  return globalThis.__apexDb;
}

export { schema };
