import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDecks } from "@/lib/decks/load";
import { workedText, type WorkedSlide } from "@/lib/decks/schema";
import { LR_TYPES, RC_QTYPES } from "@/lib/content/taxonomy";

const lessonIds = new Set(
  readdirSync(path.join(process.cwd(), "content", "lessons"), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => readFileSync(path.join(process.cwd(), "content", "lessons", f), "utf8").match(/^id:\s*(\S+)/m)?.[1])
    .filter(Boolean) as string[],
);

describe("strategy decks", async () => {
  const { decks, errors } = await readDecks();
  const worked = decks.flatMap((d) => d.slides.filter((s): s is WorkedSlide => s.kind === "worked").map((w) => ({ d, w })));

  it("all deck files are valid", () => {
    expect(errors).toEqual([]);
    expect(decks.length).toBeGreaterThanOrEqual(30);
    expect(new Set(decks.map((d) => d.id)).size).toBe(decks.length);
  });

  it("cover every LR and RC question type", () => {
    const lr = new Set(decks.filter((d) => d.section === "LR").flatMap((d) => d.types));
    const rc = new Set(decks.filter((d) => d.section === "RC").flatMap((d) => d.types));
    expect(LR_TYPES.filter((t) => !lr.has(t))).toEqual([]);
    expect(RC_QTYPES.filter((t) => !rc.has(t))).toEqual([]);
  });

  it("use real types and lessons", () => {
    for (const d of decks) {
      const valid: readonly string[] = d.section === "LR" ? LR_TYPES : RC_QTYPES;
      expect(d.types.filter((t) => !valid.includes(t)), d.id).toEqual([]);
      expect(d.lessonIds.filter((l) => !lessonIds.has(l)), d.id).toEqual([]);
      if (d.slides.some((s) => s.kind === "practice")) expect(d.types.length, `${d.id} has practice but no types`).toBeGreaterThan(0);
    }
  });

  it("worked examples are well formed", () => {
    for (const { d, w } of worked) {
      if (d.section === "RC") expect(w.passage, `${d.id} RC example needs a passage`).toBeTruthy();
      else expect(w.stimulus, `${d.id} LR example needs a stimulus`).toBeTruthy();
      const text = workedText(w);
      for (const s of w.steps) if (s.highlight) expect(text.includes(s.highlight), `${d.id}: highlight not found: "${s.highlight}"`).toBe(true);
    }
  });

  it("worked-example keys are spread and not given away by length", () => {
    const letters = worked.map(({ w }) => w.answer);
    for (const l of ["A", "B", "C", "D", "E"]) expect(letters.filter((x) => x === l).length, `key ${l}`).toBeGreaterThanOrEqual(3);
    const longest = worked.filter(({ w }) => {
      const len = Object.fromEntries(Object.entries(w.choices).map(([k, v]) => [k, v.length]));
      return Object.entries(len).every(([k, v]) => k === w.answer || v < len[w.answer]);
    });
    expect(longest.length / worked.length).toBeLessThanOrEqual(0.4);
  });
});
