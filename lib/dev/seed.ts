/**
 * Demo / test seed: six weeks of plausible study history for one student who
 * starts around 158 and climbs toward the low 170s. Deterministic (seeded RNG)
 * so screenshots and e2e assertions are stable.
 *
 * Writes attempts (drill + timed + pt), misses (most reviewed), sessions
 * (drill, section, pt with BR), skills (via the real rating update), and a few
 * completed lessons. Never touches settings or the plan.
 */
import { eq, sql } from "drizzle-orm";
import { subDays } from "date-fns";
import { getDb, schema } from "@/lib/db/client";
import { updateRating, RATING_DEFAULT } from "@/lib/engine/rating";
import { rawToScaled } from "@/lib/scoring/tables";
import type { Difficulty } from "@/lib/content/taxonomy";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export async function seedDemo(opts: { weeks?: number; seed?: number } = {}) {
  const db = await getDb();
  const weeks = opts.weeks ?? 6;
  const rand = rng(opts.seed ?? 42);
  const qs = await db.select({ id: schema.questions.id, section: schema.questions.section, type: schema.questions.type, logicTags: schema.questions.logicTags, difficulty: schema.questions.difficulty, answer: schema.questions.answer, passageId: schema.questions.passageId }).from(schema.questions).where(eq(schema.questions.source, "original"));
  if (!qs.length) throw new Error("bank not loaded");
  const styleByPassage = new Map((await db.select({ id: schema.passages.id, style: schema.passages.style }).from(schema.passages)).map((p) => [p.id, p.style]));
  const lr = qs.filter((q) => q.section === "LR");
  const rc = qs.filter((q) => q.section === "RC");

  // per-type "true skill" with a few deliberate weaknesses, improving over time
  const weak = new Set(["parallel_reasoning", "parallel_flaw", "necessary_assumption", "principle"]);
  const skills = new Map<string, { rating: number; n: number; correct: number }>();
  const bump = (dim: string, key: string, d: Difficulty, ok: boolean) => {
    const k = `${dim}:${key}`;
    const cur = skills.get(k) ?? { rating: RATING_DEFAULT, n: 0, correct: 0 };
    skills.set(k, updateRating(cur, d, ok));
  };
  const pCorrect = (q: (typeof qs)[number], dayFrac: number, timed: boolean) => {
    const base = 0.62 + 0.22 * dayFrac; // 62% → 84% over the window
    const diff = [0.18, 0.08, -0.06, -0.2][q.difficulty - 1];
    const w = weak.has(q.type) ? -0.14 : 0;
    const t = timed ? -0.07 : 0;
    return Math.max(0.15, Math.min(0.97, base + diff + w + t));
  };
  const letters = ["A", "B", "C", "D", "E"];
  const wrongAnswer = (key: string | null) => letters.filter((l) => l !== key)[Math.floor(rand() * 4)];
  const ERRS = ["misread", "logic_gap", "trap", "time_pressure", "careless"] as const;
  const dayStr = (d: Date) => d.toISOString().slice(0, 10);

  const attempts: (typeof schema.attempts.$inferInsert)[] = [];
  const misses: (typeof schema.misses.$inferInsert)[] = [];
  const sessions: (typeof schema.sessions.$inferInsert)[] = [];
  let seq = 0;
  const id = (p: string) => `${p}_seed_${(seq++).toString(36)}`;
  const totalDays = weeks * 7;
  const now = new Date();

  for (let dayAgo = totalDays; dayAgo >= 0; dayAgo--) {
    const dow = (now.getDay() - (dayAgo % 7) + 7) % 7;
    if (dow === 0 && rand() < 0.7) continue; // most Sundays off
    if (rand() < 0.12) continue; // occasional missed day
    const dayFrac = 1 - dayAgo / totalDays;
    const at = (h: number, m = 0) => new Date(subDays(now, dayAgo).setHours(h, m, Math.floor(rand() * 60), 0));

    // Drill: 12–20 questions, untimed, with confidence tags.
    const sid = id("drl");
    const start = at(18, 10);
    const nDrill = 12 + Math.floor(rand() * 9);
    let pos = 0;
    const pool = rand() < 0.25 ? rc : lr;
    for (let i = 0; i < nDrill; i++) {
      const q = pool[Math.floor(rand() * pool.length)];
      const p = pCorrect(q, dayFrac, false);
      const ok = rand() < p;
      const conf = p > 0.8 ? (rand() < 0.75 ? "sure" : "leaning") : p > 0.55 ? (rand() < 0.6 ? "leaning" : rand() < 0.5 ? "sure" : "guess") : rand() < 0.5 ? "guess" : "leaning";
      const secs = Math.round(40 + rand() * 70 + (q.difficulty - 1) * 20);
      const aid = id("att");
      attempts.push({ id: aid, sessionId: sid, questionId: q.id, mode: "drill", position: pos++, answer: ok ? q.answer : wrongAnswer(q.answer), correct: ok, seconds: secs, confidence: conf, guessFlag: false, flagged: false, createdAt: new Date(start.getTime() + i * secs * 1000) });
      bump("section", q.section, q.difficulty as Difficulty, ok);
      bump(q.section === "RC" ? "rc_qtype" : "type", q.type, q.difficulty as Difficulty, ok);
      for (const t of q.logicTags ?? []) bump("tag", t, q.difficulty as Difficulty, ok);
      if (q.passageId && styleByPassage.get(q.passageId)) bump("rc_style", styleByPassage.get(q.passageId)!, q.difficulty as Difficulty, ok);
      if (!ok) {
        const reviewed = rand() < 0.75;
        misses.push({ attemptId: aid, questionId: q.id, errorType: reviewed ? ERRS[Math.floor(rand() * ERRS.length)] : null, errorSuggested: "trap", reviewed, reviewedAt: reviewed ? new Date(start.getTime() + 3600_000) : null, srsBox: reviewed ? 2 : 1, nextDue: dayStr(new Date(start.getTime() + (reviewed ? 5 : 3) * 86400_000)), createdAt: new Date(start.getTime() + i * secs * 1000) });
      }
    }
    sessions.push({ id: sid, kind: "drill", section: pool === rc ? "RC" : "LR", timed: false, nQuestions: nDrill, scoreRaw: attempts.filter((a) => a.sessionId === sid && a.correct).length, startedAt: start, finishedAt: new Date(start.getTime() + nDrill * 90_000), settings: { seeded: true } });

    // Timed LR section twice a week from week 2; a PT every Saturday from week 3.
    const isPt = dow === 6 && dayAgo <= totalDays - 14;
    const isSection = !isPt && (dow === 2 || dow === 4) && dayAgo <= totalDays - 7;
    if (isSection || isPt) {
      const nSec = isPt ? 4 : 1;
      const sid2 = id(isPt ? "pt" : "sec");
      const start2 = at(9, 0);
      let timedRaw = 0, brRaw = 0, total = 0;
      for (let s = 0; s < nSec; s++) {
        const secPool = isPt && s === 2 ? rc : lr;
        const nQ = secPool === rc ? 27 : 25;
        for (let i = 0; i < nQ; i++) {
          const q = secPool[Math.floor(rand() * secPool.length)];
          const p = pCorrect(q, dayFrac, true);
          const ok = rand() < p;
          const secs = Math.round(45 + rand() * 60 + (q.difficulty - 1) * 25 + (!ok && rand() < 0.3 ? 90 : 0));
          const flagged = !ok ? rand() < 0.5 : rand() < 0.1;
          const brOk = ok ? (flagged ? rand() < 0.95 : true) : flagged ? rand() < 0.55 : false; // BR recovers about half of flagged misses
          const aid = id("att");
          attempts.push({ id: aid, sessionId: sid2, questionId: q.id, mode: isPt ? "pt" : "timed", position: s * 30 + i, answer: ok ? q.answer : wrongAnswer(q.answer), correct: ok, seconds: secs, confidence: null, guessFlag: secs < 10, flagged, brAnswer: flagged ? (brOk ? q.answer : wrongAnswer(q.answer)) : null, brCorrect: flagged ? brOk : ok, createdAt: new Date(start2.getTime() + (s * 40 + i) * 80_000) });
          bump("section", q.section, q.difficulty as Difficulty, ok);
          bump(q.section === "RC" ? "rc_qtype" : "type", q.type, q.difficulty as Difficulty, ok);
          for (const t of q.logicTags ?? []) bump("tag", t, q.difficulty as Difficulty, ok);
          if (s !== 3 || !isPt) {
            total++;
            if (ok) timedRaw++;
            if (brOk) brRaw++;
          }
          if (!ok) misses.push({ attemptId: aid, questionId: q.id, errorSuggested: flagged ? "time_pressure" : "trap", errorType: rand() < 0.6 ? "time_pressure" : null, reviewed: rand() < 0.6, srsBox: 1, nextDue: dayStr(new Date(start2.getTime() + 3 * 86400_000)), createdAt: start2 });
        }
      }
      const scale = isPt ? 77 : 77;
      const raw77 = isPt ? timedRaw : Math.round((timedRaw / 25) * 77);
      const br77 = isPt ? brRaw : Math.round((brRaw / 25) * 77);
      sessions.push({ id: sid2, kind: isPt ? "pt" : "section", section: isPt ? null : "LR", timed: true, durationSec: isPt ? 4 * 35 * 60 : 35 * 60, elapsedSec: isPt ? 4 * 34 * 60 : 34 * 60, nQuestions: total, scoreRaw: timedRaw, scoreScaled: rawToScaled(raw77, scale), brRaw, brScaled: rawToScaled(br77, scale), startedAt: start2, finishedAt: new Date(start2.getTime() + (isPt ? 170 : 40) * 60_000), settings: { seeded: true, experimental: isPt ? 3 : undefined } });
    }
  }

  // write
  for (let i = 0; i < sessions.length; i += 200) await db.insert(schema.sessions).values(sessions.slice(i, i + 200)).onConflictDoNothing();
  for (let i = 0; i < attempts.length; i += 500) await db.insert(schema.attempts).values(attempts.slice(i, i + 500)).onConflictDoNothing();
  for (let i = 0; i < misses.length; i += 500) await db.insert(schema.misses).values(misses.slice(i, i + 500));
  for (const [k, v] of skills) {
    const [dimension, key] = k.split(":") as [typeof schema.skills.$inferInsert.dimension, string];
    await db
      .insert(schema.skills)
      .values({ dimension, key, rating: v.rating, n: v.n, correct: v.correct, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.skills.dimension, schema.skills.key], set: { rating: v.rating, n: v.n, correct: v.correct, updatedAt: new Date() } });
  }
  // a handful of completed lessons
  const lessonIds = ["u0/how-the-test-works", "u1/arguments-1", "u1/arguments-2", "u2/flaw", "u2/weaken"];
  for (const l of lessonIds) await db.insert(schema.lessonsProgress).values({ lessonId: l, status: "complete", checkScore: 5, checkTotal: 5, completedAt: subDays(now, 20), updatedAt: subDays(now, 20) }).onConflictDoNothing();

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.attempts);
  return { attempts: attempts.length, misses: misses.length, sessions: sessions.length, skills: skills.size, totalAttempts: n };
}
