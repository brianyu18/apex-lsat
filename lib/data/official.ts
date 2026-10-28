import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { format } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { getSettings, updateSettings } from "./settings";
import { getActivePlan, getPlanDays } from "./plan";
import { buildTrack, type OfficialResult } from "@/lib/planner/official-track";

export async function officialResults(): Promise<OfficialResult[]> {
  const db = await getDb();
  const rows = await db
    .select({ pt: schema.sessions.ptRef, scaled: schema.sessions.scoreScaled, at: schema.sessions.finishedAt })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.kind, "pt"), isNotNull(schema.sessions.ptRef), isNotNull(schema.sessions.finishedAt)))
    .orderBy(desc(schema.sessions.finishedAt));
  return rows.map((r) => ({ pt: r.pt!, scaled: r.scaled, takenAt: r.at! }));
}

export async function officialTrack(today = format(new Date(), "yyyy-MM-dd")) {
  const s = await getSettings();
  const available = s.officialPts ?? [];
  const plan = await getActivePlan();
  const days = plan ? await getPlanDays(plan.id) : [];
  const results = await officialResults();
  const track = buildTrack(
    available,
    days.map((d) => ({ day: d.day, phase: d.phase, blocks: d.blocks as { kind: string; minutes: number; label: string }[] as never, minutes: d.minutes })),
    results,
    today,
  );
  return { available, track, results, hasPlan: Boolean(plan) };
}

/** The official PT scheduled for a given day, if any (used by the plan page). */
export async function officialForDay(day: string) {
  const { track } = await officialTrack();
  return track.entries.find((e) => e.day === day && e.status === "scheduled")?.pt ?? null;
}

export async function setOfficialPts(pts: number[]) {
  await updateSettings({ officialPts: pts });
}

export async function setGist(questionId: string, gist: string) {
  const db = await getDb();
  await db.update(schema.questions).set({ gist: gist.trim() || null }).where(and(eq(schema.questions.id, questionId), eq(schema.questions.source, "official_ref")));
}
