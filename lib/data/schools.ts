import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { getSettings, updateSettings } from "./settings";
import { scoreRange } from "@/lib/scoring/range";
import { goalFromTargets, odds, type Odds, type School } from "@/lib/schools/odds";

const FILE = () => process.env.APEX_SCHOOLS_FILE ?? path.join(process.cwd(), "content", "schools", "schools.json");

let cache: { mtime: number; schools: School[] } | null = null;
export async function loadSchools(): Promise<School[]> {
  try {
    const { stat } = await import("node:fs/promises");
    const st = await stat(FILE());
    if (cache && cache.mtime === st.mtimeMs) return cache.schools;
    const schools = JSON.parse(await readFile(FILE(), "utf8")) as School[];
    cache = { mtime: st.mtimeMs, schools };
    return schools;
  } catch {
    return [];
  }
}

/** The LSAT the odds are computed at: the running range mean when there are full tests, else the goal. */
export async function planningScore() {
  const db = await getDb();
  const s = await getSettings();
  const tests = await db
    .select({ scaled: schema.sessions.scoreScaled, brScaled: schema.sessions.brScaled, finishedAt: schema.sessions.finishedAt })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.kind, "pt"), isNotNull(schema.sessions.scoreScaled), isNotNull(schema.sessions.finishedAt)));
  const range = scoreRange(tests.map((t) => ({ scaled: t.scaled!, brScaled: t.brScaled, finishedAt: t.finishedAt! })));
  return { range, current: range.mean != null ? Math.round(range.mean) : null, goal: s.goalScore, gpa: s.gpa ?? null, targets: s.targetSchools ?? [] };
}

export interface SchoolRow {
  school: School;
  current: Odds | null;
  atGoal: Odds;
  atLow: Odds | null;
  atHigh: Odds | null;
  target: boolean;
}

export async function schoolsData() {
  const [schools, ps] = await Promise.all([loadSchools(), planningScore()]);
  const rows: SchoolRow[] = schools.map((school) => ({
    school,
    current: ps.current != null ? odds(school, ps.current, ps.gpa) : null,
    atGoal: odds(school, ps.goal, ps.gpa),
    atLow: ps.range.low != null ? odds(school, ps.range.low, ps.gpa) : null,
    atHigh: ps.range.high != null ? odds(school, ps.range.high, ps.gpa) : null,
    target: ps.targets.includes(school.id),
  }));
  const targetGoal = goalFromTargets(schools.filter((s) => ps.targets.includes(s.id)));
  return { rows, ...ps, targetGoal, year: schools[0]?.year ?? null };
}

export async function setGpa(gpa: number | null) {
  await updateSettings({ gpa });
}
export async function toggleTarget(id: string) {
  const s = await getSettings();
  const cur = s.targetSchools ?? [];
  await updateSettings({ targetSchools: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
}
