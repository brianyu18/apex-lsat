import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { format } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { generatePlan, type GeneratedPlan, type PlanDay as GenDay } from "@/lib/planner/generate";
import { replan } from "@/lib/planner/replan";
import { getSettings } from "./settings";

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function getActivePlan() {
  const db = await getDb();
  const rows = await db.select().from(schema.plan).where(eq(schema.plan.active, true)).limit(1);
  return rows[0] ?? null;
}

export async function getPlanDays(planId: string, from?: string, to?: string) {
  const db = await getDb();
  const conds = [eq(schema.planDays.planId, planId)];
  if (from) conds.push(gte(schema.planDays.day, from));
  if (to) conds.push(lte(schema.planDays.day, to));
  return db.select().from(schema.planDays).where(and(...conds)).orderBy(schema.planDays.day);
}

export async function getToday(day = format(new Date(), "yyyy-MM-dd")) {
  const p = await getActivePlan();
  if (!p) return null;
  const rows = await getPlanDays(p.id, day, day);
  return rows[0] ?? null;
}

/** Build (or rebuild) the active plan from current settings. Completed past days are preserved. */
export async function regeneratePlan(opts: { preserveCompleted?: boolean } = {}): Promise<GeneratedPlan> {
  const db = await getDb();
  const s = await getSettings();
  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = s.startDate ?? today;
  const input = {
    testDate: s.testDate,
    hoursPerWeek: s.hoursPerWeek,
    daysPerWeek: s.daysPerWeek,
    diagnosticScaled: s.diagnostic?.scaled ?? null,
  };

  const previous = await getActivePlan();
  let generated: GeneratedPlan;
  if (previous && opts.preserveCompleted !== false) {
    const past = await getPlanDays(previous.id, undefined, today);
    const preserved: GenDay[] = past
      .filter((d) => d.day < today)
      .map((d) => ({ day: d.day, phase: d.phase, blocks: d.blocks as GenDay["blocks"], minutes: d.minutes }));
    generated = replan(input, { today, completedDays: preserved });
    // keep the original start date on the stored plan
    generated = { ...generated };
  } else {
    generated = generatePlan({ ...input, startDate });
  }

  const id = newId("plan");
  // Read everything we need BEFORE opening the transaction: PGlite is a single
  // connection, so a query on the outer handle inside a transaction deadlocks.
  const prevDays = previous ? await getPlanDays(previous.id) : [];
  const doneMap = new Map(prevDays.map((d) => [d.day, d]));
  await db.transaction(async (tx) => {
    if (previous) await tx.update(schema.plan).set({ active: false }).where(eq(schema.plan.id, previous.id));
    await tx.insert(schema.plan).values({
      id,
      testDate: generated.testDate,
      provisional: generated.provisional,
      hoursPerWeek: s.hoursPerWeek,
      daysPerWeek: s.daysPerWeek,
      phases: generated.phases,
      active: true,
    });
    // carry over completion flags
    const chunk = 200;
    for (let i = 0; i < generated.days.length; i += chunk) {
      await tx.insert(schema.planDays).values(
        generated.days.slice(i, i + chunk).map((d) => ({
          planId: id,
          day: d.day,
          phase: d.phase,
          blocks: d.blocks,
          minutes: d.minutes,
          completed: doneMap.get(d.day)?.completed ?? false,
          completedMinutes: doneMap.get(d.day)?.completedMinutes ?? 0,
        })),
      );
    }
    if (previous) await tx.delete(schema.planDays).where(eq(schema.planDays.planId, previous.id));
    if (previous) await tx.delete(schema.plan).where(eq(schema.plan.id, previous.id));
  });
  if (!s.startDate) {
    await db.update(schema.settings).set({ startDate }).where(eq(schema.settings.id, 1));
  }
  return generated;
}

export async function markDay(day: string, completed: boolean, completedMinutes?: number) {
  const db = await getDb();
  const p = await getActivePlan();
  if (!p) return;
  await db
    .update(schema.planDays)
    .set({ completed, ...(completedMinutes != null ? { completedMinutes } : {}) })
    .where(and(eq(schema.planDays.planId, p.id), eq(schema.planDays.day, day)));
}
