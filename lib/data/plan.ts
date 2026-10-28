import "server-only";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { format } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { generatePlan, type GeneratedPlan, type Phase, type PlanDay as GenDay } from "@/lib/planner/generate";
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
export async function regeneratePlan(opts: { preserveCompleted?: boolean } = {}): Promise<GeneratedPlan & { extended?: Phase | null }> {
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
  let extraDays: Partial<Record<Phase, number>> = {};
  let extended: Phase | null = null;
  if (previous && opts.preserveCompleted !== false) {
    const past = await getPlanDays(previous.id, undefined, today);
    const preserved: GenDay[] = past
      .filter((d) => d.day < today)
      .map((d) => ({ day: d.day, phase: d.phase, blocks: d.blocks as GenDay["blocks"], minutes: d.minutes }));
    const signals = await phaseSignals();
    const result = replan(input, { today, completedDays: preserved, startDate: previous.startDate ?? startDate, priorExtraDays: (previous.extraDays as Record<Phase, number> | null) ?? undefined, signals });
    generated = result;
    extraDays = result.extraDays;
    extended = result.extended;
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
      extraDays: Object.keys(extraDays).length ? (extraDays as Record<string, number>) : null,
      startDate: previous?.startDate ?? startDate,
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
  return { ...generated, extended };
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

/* ---------------- planner v2: exit-criteria signals ---------------- */

import { inArray as dInArray, like as dLike } from "drizzle-orm";
import { skillLevel } from "@/lib/engine/rating";
import { LR_TYPES } from "@/lib/content/taxonomy";
import { scoreRange } from "@/lib/scoring/range";
import { registrationAdvice, type PhaseSignals } from "@/lib/planner/replan";

/** Evaluate whether each phase has done its job, from real data. null = not enough data to say. */
export async function phaseSignals(): Promise<PhaseSignals> {
  const db = await getDb();
  // foundations: ≥ 80% of U0–U1 lessons complete
  const u01 = await db
    .select({ id: schema.lessonsProgress.lessonId, status: schema.lessonsProgress.status })
    .from(schema.lessonsProgress)
    .where(dLike(schema.lessonsProgress.lessonId, "u1/%"));
  const u1Total = 18; // lessons in Unit 1
  const u1Done = u01.filter((l) => l.status === "complete").length;
  const foundationsPassed = u01.length === 0 ? null : u1Done / u1Total >= 0.8;

  // lr: ≥ 75% of LR types with ≥ 10 counted attempts at level-3 band or higher (needs ≥ 8 such types)
  const typeRows = await db.select().from(schema.skills).where(and(eq(schema.skills.dimension, "type"), dInArray(schema.skills.key, [...LR_TYPES])));
  const rated = typeRows.filter((r) => r.n >= 10);
  const lrReady = rated.length < 8 ? null : rated.filter((r) => skillLevel(r.rating) >= 3).length / rated.length >= 0.75;

  // rc: section rating at level-3 band with ≥ 30 counted attempts
  const [rc] = await db.select().from(schema.skills).where(and(eq(schema.skills.dimension, "section"), eq(schema.skills.key, "RC")));
  const rcReady = !rc || rc.n < 30 ? null : skillLevel(rc.rating) >= 3;
  return { foundationsPassed, lrReady, rcReady };
}

/** Registration advice from full-length tests + current settings. */
export async function registrationStatus() {
  const db = await getDb();
  const s = await getSettings();
  const tests = await db
    .select({ scaled: schema.sessions.scoreScaled, brScaled: schema.sessions.brScaled, finishedAt: schema.sessions.finishedAt })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.kind, "pt"), isNotNull(schema.sessions.scoreScaled)));
  const range = scoreRange(tests.filter((t) => t.scaled != null && t.finishedAt).map((t) => ({ scaled: t.scaled!, brScaled: t.brScaled, finishedAt: t.finishedAt! })));
  return { range, advice: registrationAdvice(range, s.goalScore, s.testDate), goal: s.goalScore, testDate: s.testDate };
}
