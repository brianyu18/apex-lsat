import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LessonQuizzesSchema } from "@/lib/content/schema";

const ROOT = path.join(process.cwd(), "content");
const bank = new Map<string, { id: string; difficulty: number; type: string }>();
for (const f of readdirSync(path.join(ROOT, "bank/lr"))) {
  const j = JSON.parse(readFileSync(path.join(ROOT, "bank/lr", f), "utf8"));
  for (const q of Array.isArray(j) ? j : j.questions) bank.set(q.id, q);
}
const { pools } = JSON.parse(readFileSync(path.join(ROOT, "lessons/check-pools.json"), "utf8")) as { pools: Record<string, { note: string; ids: string[] }> };
const lessons = readdirSync(path.join(ROOT, "lessons"))
  .filter((u) => statSync(path.join(ROOT, "lessons", u)).isDirectory())
  .flatMap((u) => readdirSync(path.join(ROOT, "lessons", u)).filter((f) => f.endsWith(".mdx")).map((f) => ({ id: `${u}/${f.replace(".mdx", "")}`, src: readFileSync(path.join(ROOT, "lessons", u, f), "utf8") })));

describe("lesson check pools", () => {
  it("name real lessons and real LR bank questions, with no duplicates", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const [lesson, p] of Object.entries(pools)) {
      expect(ids.has(lesson), lesson).toBe(true);
      expect(p.note.length, lesson).toBeGreaterThan(5);
      expect(new Set(p.ids).size, `${lesson} has duplicate ids`).toBe(p.ids.length);
      for (const q of p.ids) expect(bank.has(q), `${lesson}: ${q}`).toBe(true);
    }
  });

  it("have at least 20 questions and at least 4 at each level", () => {
    for (const [lesson, p] of Object.entries(pools)) {
      expect(p.ids.length, lesson).toBeGreaterThanOrEqual(20);
      for (const lv of [1, 2, 3, 4]) expect(p.ids.filter((q) => bank.get(q)!.difficulty === lv).length, `${lesson} level ${lv}`).toBeGreaterThanOrEqual(4);
    }
  });

  it("differ between lessons in the same series", () => {
    const series = [
      ["u1/conditional-1", "u1/conditional-2", "u1/conditional-3"],
      ["u1/flaws-1", "u1/flaws-2"],
      ["u1/grammar-1", "u1/grammar-2"],
      ["u1/quantifiers-1", "u1/quantifiers-2"],
      ["u1/arguments-2", "u1/arguments-3"],
    ];
    for (const group of series) {
      const seen = new Map<string, string>();
      for (const l of group) {
        expect(pools[l], l).toBeTruthy();
        for (const q of pools[l].ids) {
          expect(seen.get(q), `${q} is in both ${seen.get(q)} and ${l}`).toBeUndefined();
          seen.set(q, l);
        }
      }
    }
  });

  it("cover every Foundations lesson whose skill is narrower than a question type", () => {
    for (const l of ["conditional-1", "conditional-2", "conditional-3", "conditional-4", "flaws-1", "flaws-2", "grammar-1", "grammar-2", "grammar-3", "quantifiers-1", "quantifiers-2", "arguments-2", "arguments-3", "causation-2"])
      expect(pools[`u1/${l}`], l).toBeTruthy();
  });
});

describe("lesson quizzes", () => {
  const quizzes = LessonQuizzesSchema.parse(JSON.parse(readFileSync(path.join(ROOT, "lessons/quizzes.json"), "utf8")));
  it("exist for every quiz-mode lesson and only for those", () => {
    const quizLessons = lessons.filter((l) => /^checkMode:\s*quiz\s*$/m.test(l.src)).map((l) => l.id);
    expect(quizLessons.sort()).toEqual(Object.keys(quizzes).sort());
    expect(quizLessons.length).toBe(3);
  });
  it("have five questions each, with keys spread", () => {
    for (const [id, qs] of Object.entries(quizzes)) {
      expect(qs.length, id).toBe(5);
      expect(new Set(qs.map((q) => q.answer)).size, `${id} keys`).toBeGreaterThanOrEqual(3);
    }
  });
});
