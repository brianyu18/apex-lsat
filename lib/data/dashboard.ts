import "server-only";
import { desc, eq, gte, sql } from "drizzle-orm";
import { format, parseISO, startOfWeek, subDays } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { getSettings } from "./settings";
import { getToday } from "./plan";
import { reviewCounts } from "./review";
import { getAllSkills } from "./skills";
import { ratingToPercent, skillLevel } from "@/lib/engine/rating";
import { LR_TYPE_INFO, type LRType } from "@/lib/content/taxonomy";

export async function studyDays(sinceDays = 90): Promise<string[]> {
  const db = await getDb();
  const since = subDays(new Date(), sinceDays);
  const rows = await db
    .select({ day: sql<string>`to_char(${schema.attempts.createdAt} at time zone 'UTC', 'YYYY-MM-DD')` })
    .from(schema.attempts)
    .where(gte(schema.attempts.createdAt, since))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows.map((r) => r.day);
}

/** Streak in weeks where the days/week goal was met, plus this week's count. */
export function computeStreak(days: string[], goalPerWeek: number, today = new Date()) {
  const set = new Set(days);
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  let thisWeek = 0;
  for (let d = new Date(thisWeekStart); d <= today; d.setDate(d.getDate() + 1)) if (set.has(format(d, "yyyy-MM-dd"))) thisWeek++;
  // consecutive previous full weeks meeting the goal
  let weeks = 0;
  let cursor = subDays(thisWeekStart, 7);
  for (let w = 0; w < 52; w++) {
    let n = 0;
    for (let i = 0; i < 7; i++) if (set.has(format(subDays(cursor, -i), "yyyy-MM-dd"))) n++;
    if (n >= goalPerWeek) {
      weeks++;
      cursor = subDays(cursor, 7);
    } else break;
  }
  // current day streak (consecutive days with activity ending today or yesterday)
  let dayStreak = 0;
  let d = new Date(today);
  if (!set.has(format(d, "yyyy-MM-dd"))) d = subDays(d, 1);
  while (set.has(format(d, "yyyy-MM-dd"))) {
    dayStreak++;
    d = subDays(d, 1);
  }
  return { weeks, thisWeek, dayStreak, studiedToday: set.has(format(today, "yyyy-MM-dd")) };
}

export async function recentAccuracy(days = 14) {
  const db = await getDb();
  const since = subDays(new Date(), days);
  const [row] = await db
    .select({
      n: sql<number>`count(*) filter (where ${schema.attempts.correct} is not null and not ${schema.attempts.guessFlag})::int`,
      c: sql<number>`count(*) filter (where ${schema.attempts.correct} and not ${schema.attempts.guessFlag})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(schema.attempts)
    .where(gte(schema.attempts.createdAt, since));
  return { n: row?.n ?? 0, correct: row?.c ?? 0, total: row?.total ?? 0 };
}

export async function dashboardData() {
  const [settings, today, counts, skills, days, acc] = await Promise.all([getSettings(), getToday(), reviewCounts(), getAllSkills(), studyDays(), recentAccuracy()]);
  const streak = computeStreak(days, settings.daysPerWeek);
  const sectionSkills = Object.fromEntries(
    skills.filter((s) => s.dimension === "section").map((s) => [s.key, { rating: s.rating, pct: ratingToPercent(s.rating), level: skillLevel(s.rating), n: s.n }]),
  ) as Record<string, { rating: number; pct: number; level: number; n: number }>;
  const typeSkills = skills
    .filter((s) => s.dimension === "type" && s.n >= 3)
    .map((s) => ({
      key: s.key,
      label: LR_TYPE_INFO[s.key as LRType]?.label ?? s.key,
      pct: ratingToPercent(s.rating),
      n: s.n,
      acc: s.n ? s.correct / s.n : 0,
      freq: LR_TYPE_INFO[s.key as LRType]?.freq ?? 0,
    }))
    .sort((a, b) => a.pct - b.pct);
  const db = await getDb();
  const lastSessions = await db.select().from(schema.sessions).orderBy(desc(schema.sessions.startedAt)).limit(5);
  const lessonsDone = await db.select({ n: sql<number>`count(*)::int` }).from(schema.lessonsProgress).where(eq(schema.lessonsProgress.status, "complete"));
  return { settings, today, counts, streak, sectionSkills, typeSkills, acc, lastSessions, lessonsDone: lessonsDone[0]?.n ?? 0, daysActive: days };
}

export function daysToTest(testDate: string | null) {
  if (!testDate) return null;
  return Math.ceil((parseISO(testDate).getTime() - Date.now()) / 86400000);
}
