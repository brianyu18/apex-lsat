import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { subDays } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { getSettings } from "./settings";
import { studyDays } from "./dashboard";
import { getAllSkills } from "./skills";
import { scoreRange, type ScoredTest } from "@/lib/scoring/range";
import { rankPriorities, pointsOnTable, type PriorityInput } from "@/lib/scoring/priorities";
import { studyQuality, type QualityInput } from "@/lib/scoring/quality";
import { LR_TYPE_INFO, LOGIC_TAG_LABELS, RC_QTYPE_INFO, type LRType, type LogicTag, type RCQType } from "@/lib/content/taxonomy";

/** Full-length tests (simulated PTs + LawHub imports) in chronological order, plus the running range. */
export async function scoreHistory() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.kind, "pt"), isNotNull(schema.sessions.finishedAt), isNotNull(schema.sessions.scoreScaled)))
    .orderBy(schema.sessions.startedAt);
  const tests: (ScoredTest & { id: string; pt: number | null; brScaled: number | null; raw: number | null })[] = rows.map((r) => ({
    id: r.id,
    pt: r.ptRef,
    scaled: r.scoreScaled!,
    brScaled: r.brScaled,
    raw: r.scoreRaw,
    finishedAt: r.finishedAt!,
  }));
  // running range after each test
  const series = tests.map((t, i) => {
    const r = scoreRange(tests.slice(0, i + 1));
    return { ...t, rangeLow: r.low!, rangeHigh: r.high!, rangeMean: r.mean!, brGap: t.brScaled != null ? t.brScaled - t.scaled : null };
  });
  return { tests: series, range: scoreRange(tests) };
}

/** Timed sections (not PTs) — scaled equivalents, for the finer-grained trend. */
export async function sectionHistory(limit = 30) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(inArray(schema.sessions.kind, ["section", "skip_trainer"]), isNotNull(schema.sessions.finishedAt), isNotNull(schema.sessions.scoreScaled)))
    .orderBy(desc(schema.sessions.startedAt))
    .limit(limit);
  return rows.reverse().map((r) => ({ id: r.id, section: r.section, scaled: r.scoreScaled, brScaled: r.brScaled, raw: r.scoreRaw, n: r.nQuestions, finishedAt: r.finishedAt! }));
}

export async function accuracyByLevel(days = 30) {
  const db = await getDb();
  const since = subDays(new Date(), days);
  const rows = await db
    .select({
      level: schema.questions.difficulty,
      n: sql<number>`count(*) filter (where ${schema.attempts.correct} is not null and not ${schema.attempts.guessFlag})::int`,
      c: sql<number>`count(*) filter (where ${schema.attempts.correct} and not ${schema.attempts.guessFlag})::int`,
    })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(gte(schema.attempts.createdAt, since))
    .groupBy(schema.questions.difficulty)
    .orderBy(schema.questions.difficulty);
  return [1, 2, 3, 4].map((l) => {
    const r = rows.find((x) => x.level === l);
    return { level: l, n: r?.n ?? 0, correct: r?.c ?? 0, acc: r?.n ? r.c / r.n : null };
  });
}

/** Accuracy by confidence tag — the calibration curve. */
export async function calibration(days = 30) {
  const db = await getDb();
  const since = subDays(new Date(), days);
  const rows = await db
    .select({
      confidence: schema.attempts.confidence,
      n: sql<number>`count(*) filter (where ${schema.attempts.correct} is not null)::int`,
      c: sql<number>`count(*) filter (where ${schema.attempts.correct})::int`,
    })
    .from(schema.attempts)
    .where(and(gte(schema.attempts.createdAt, since), isNotNull(schema.attempts.confidence)))
    .groupBy(schema.attempts.confidence);
  const target: Record<string, [number, number]> = { sure: [0.9, 1], leaning: [0.6, 0.8], guess: [0.2, 0.45] };
  return (["sure", "leaning", "guess"] as const).map((k) => {
    const r = rows.find((x) => x.confidence === k);
    const acc = r?.n ? r.c / r.n : null;
    const [lo, hi] = target[k];
    const verdict = acc == null ? "—" : acc < lo ? "overconfident" : acc > hi ? "underconfident" : "calibrated";
    return { confidence: k, n: r?.n ?? 0, correct: r?.c ?? 0, acc, targetLow: lo, targetHigh: hi, verdict };
  });
}

/** Per-type seconds on right vs. wrong answers from timed attempts. */
export async function timeOnRightVsWrong(days = 60) {
  const db = await getDb();
  const since = subDays(new Date(), days);
  const rows = await db
    .select({
      type: schema.questions.type,
      section: schema.questions.section,
      nRight: sql<number>`count(*) filter (where ${schema.attempts.correct})::int`,
      nWrong: sql<number>`count(*) filter (where ${schema.attempts.correct} = false)::int`,
      secRight: sql<number>`coalesce(avg(${schema.attempts.seconds}) filter (where ${schema.attempts.correct}), 0)::float`,
      secWrong: sql<number>`coalesce(avg(${schema.attempts.seconds}) filter (where ${schema.attempts.correct} = false), 0)::float`,
    })
    .from(schema.attempts)
    .innerJoin(schema.questions, eq(schema.attempts.questionId, schema.questions.id))
    .where(and(gte(schema.attempts.createdAt, since), inArray(schema.attempts.mode, ["timed", "pt"]), isNotNull(schema.attempts.seconds)))
    .groupBy(schema.questions.type, schema.questions.section);
  return rows
    .filter((r) => r.nRight + r.nWrong >= 3)
    .map((r) => ({ ...r, label: r.section === "RC" ? (RC_QTYPE_INFO[r.type as RCQType]?.label ?? r.type) : (LR_TYPE_INFO[r.type as LRType]?.label ?? r.type) }))
    .sort((a, b) => b.secWrong - a.secWrong);
}

export async function priorities() {
  const skills = await getAllSkills();
  const inputs: PriorityInput[] = [];
  for (const s of skills) {
    if (s.dimension === "type") inputs.push({ key: s.key, label: LR_TYPE_INFO[s.key as LRType]?.label ?? s.key, dimension: "type", n: s.n, correct: s.correct, perTest: (LR_TYPE_INFO[s.key as LRType]?.freq ?? 0) * 2 });
    else if (s.dimension === "rc_qtype") inputs.push({ key: s.key, label: RC_QTYPE_INFO[s.key as RCQType]?.label ?? s.key, dimension: "rc_qtype", n: s.n, correct: s.correct, perTest: RC_QTYPE_INFO[s.key as RCQType]?.freq ?? 0 });
    else if (s.dimension === "tag") inputs.push({ key: s.key, label: LOGIC_TAG_LABELS[s.key as LogicTag] ?? s.key, dimension: "tag", n: s.n, correct: s.correct, perTest: tagPerTest(s.key) });
  }
  const rows = rankPriorities(inputs);
  return { rows, pointsOnTable: pointsOnTable(rows.filter((r) => r.dimension !== "tag")) };
}

/** Tags cut across types; a rough per-test exposure so they rank on the same scale. */
function tagPerTest(tag: string): number {
  const table: Record<string, number> = { conditional: 6, causation: 7, quantifiers: 3, comparison: 4, sampling: 3, analogy: 3, principle: 4, mental_state_v_reality: 2, lack_of_support_v_false: 3, part_whole: 2, rule_application: 3, weighing_factors: 3, value_judgment: 2 };
  return table[tag] ?? 2;
}

export async function qualityInputs(days = 30): Promise<QualityInput> {
  const db = await getDb();
  const since = subDays(new Date(), days);
  const settings = await getSettings();
  const [acc] = await db
    .select({
      n: sql<number>`count(*) filter (where ${schema.attempts.correct} is not null and not ${schema.attempts.guessFlag})::int`,
      c: sql<number>`count(*) filter (where ${schema.attempts.correct} and not ${schema.attempts.guessFlag})::int`,
      secs: sql<number>`coalesce(sum(${schema.attempts.seconds}), 0)::float`,
    })
    .from(schema.attempts)
    .where(gte(schema.attempts.createdAt, since));
  const [miss] = await db
    .select({
      n: sql<number>`count(*)::int`,
      r: sql<number>`count(*) filter (where ${schema.misses.reviewed})::int`,
    })
    .from(schema.misses)
    .where(gte(schema.misses.createdAt, since));
  const days_ = (await studyDays(days)).length;
  const kindsRows = await db.select({ kind: schema.sessions.kind, section: schema.sessions.section }).from(schema.sessions).where(gte(schema.sessions.startedAt, since));
  const kinds = new Set<string>();
  for (const k of kindsRows) {
    kinds.add(k.kind === "check" ? "drill" : k.kind === "skip_trainer" ? "section" : k.kind);
    if (k.section === "RC") kinds.add("rc");
  }
  const [lessons] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.lessonsProgress).where(gte(schema.lessonsProgress.updatedAt, since));
  if ((lessons?.n ?? 0) > 0) kinds.add("lesson");
  if ((miss?.r ?? 0) > 0) kinds.add("review");
  // study minutes: question time + lesson time (approx 8 min per lesson touched) + essay time
  const essays = await db.select({ e: sql<number>`coalesce(sum(${schema.sessions.elapsedSec}), 0)::float` }).from(schema.sessions).where(and(eq(schema.sessions.kind, "writing"), gte(schema.sessions.startedAt, since)));
  const studyMinutes = (acc?.secs ?? 0) / 60 + (lessons?.n ?? 0) * 8 + (essays[0]?.e ?? 0) / 60;
  return {
    windowDays: days,
    counted: acc?.n ?? 0,
    correct: acc?.c ?? 0,
    daysStudied: days_,
    daysPerWeekGoal: settings.daysPerWeek,
    missesInWindow: miss?.n ?? 0,
    missesReviewed: miss?.r ?? 0,
    studyMinutes,
    hoursPerWeekGoal: settings.hoursPerWeek,
    activityKinds: Array.from(kinds),
  };
}

export async function studyQualityNow(days = 30) {
  return studyQuality(await qualityInputs(days));
}

export async function analyticsData() {
  const [history, sections, levels, cal, times, pri, quality, settings] = await Promise.all([scoreHistory(), sectionHistory(), accuracyByLevel(), calibration(), timeOnRightVsWrong(), priorities(), studyQualityNow(), getSettings()]);
  return { history, sections, levels, cal, times, pri, quality, goal: settings.goalScore };
}
