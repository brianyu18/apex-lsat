import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { Settings } from "@/lib/db/schema";

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (rows[0]) return rows[0];
  // Parallel first calls can race here; the conflict target makes the insert idempotent.
  await db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing();
  const [created] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  return created;
}

export async function updateSettings(patch: Partial<Omit<Settings, "id">>): Promise<Settings> {
  const db = await getDb();
  await getSettings();
  const [row] = await db
    .update(schema.settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.settings.id, 1))
    .returning();
  return row;
}
