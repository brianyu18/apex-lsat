import { describe, expect, it } from "vitest";
import { BLUEPRINT, essayWordCount, highlightRuns, MODEL_ESSAYS, RUBRIC, UPGRADES } from "@/lib/writing/guide";
import { pickPrompt, WRITE_SEC, WRITING_PROMPTS } from "@/lib/writing/prompts";

describe("writing prompts", () => {
  it("are well formed and unique", () => {
    expect(WRITING_PROMPTS.length).toBeGreaterThanOrEqual(23);
    expect(new Set(WRITING_PROMPTS.map((p) => p.id)).size).toBe(WRITING_PROMPTS.length);
    for (const p of WRITING_PROMPTS) {
      expect(p.perspectives.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.perspectives.length, p.id).toBeLessThanOrEqual(4);
      expect(p.issue.trim().endsWith("?"), p.id).toBe(true);
      expect(p.context && p.context.length > 80, p.id).toBe(true);
      expect(p.area, p.id).toBeTruthy();
    }
  });
  it("random pick never returns a prompt that has a published model essay", () => {
    for (let i = 0; i < 200; i++) expect(pickPrompt().model).toBeFalsy();
    const all = WRITING_PROMPTS.filter((p) => !p.model).map((p) => p.id);
    expect(pickPrompt(all).model).toBeFalsy(); // falls back to the non-model pool when everything is used
  });
});

describe("model essays", () => {
  it("answer prompts in the library, flagged as having a model", () => {
    for (const e of MODEL_ESSAYS) expect(WRITING_PROMPTS.find((p) => p.id === e.promptId)?.model, e.id).toBe(true);
  });
  it("every highlighted quote appears word for word in its paragraph", () => {
    for (const e of MODEL_ESSAYS)
      for (const [k, p] of e.paragraphs.entries()) {
        expect(p.notes.length, `${e.id} ¶${k + 1}`).toBeGreaterThan(0);
        for (const n of p.notes) if (n.quote) expect(p.text.includes(n.quote), `${e.id} ¶${k + 1}: "${n.quote}"`).toBe(true);
      }
  });
  it("strong essays are a realistic 35-minute length with five paragraphs; the weak one is short", () => {
    const strong = MODEL_ESSAYS.filter((e) => e.quality === "strong");
    expect(strong.length).toBeGreaterThanOrEqual(5);
    expect(new Set(MODEL_ESSAYS.map((e) => e.id)).size).toBe(MODEL_ESSAYS.length);
    for (const e of strong) {
      expect(e.paragraphs.length, e.id).toBe(5);
      expect(essayWordCount(e), e.id).toBeGreaterThanOrEqual(400);
      expect(essayWordCount(e), e.id).toBeLessThanOrEqual(600);
      expect(e.paragraphs[0].text, e.id).not.toMatch(/^(I think|I believe|In today)/);
      expect(e.paragraphs[3].text, e.id).toMatch(/Perspective [A-D]/);
    }
    const weak = MODEL_ESSAYS.find((e) => e.quality === "weak")!;
    expect(essayWordCount(weak)).toBeLessThan(250);
    const ok = MODEL_ESSAYS.find((e) => e.quality === "ok")!;
    expect(ok.paragraphs.length).toBe(5);
    expect(essayWordCount(ok)).toBeLessThan(300);
    // each contrast essay sits directly after the strong essay on the same prompt
    for (const e of [weak, ok]) {
      const prev = MODEL_ESSAYS[MODEL_ESSAYS.indexOf(e) - 1];
      expect(prev.quality, e.id).toBe("strong");
      expect(prev.promptId, e.id).toBe(e.promptId);
    }
    // enough prompts without a model essay remain for unseen practice
    expect(WRITING_PROMPTS.filter((p) => !p.model).length).toBeGreaterThanOrEqual(18);
  });
  it("word counts quoted in the notes are close to the real counts", () => {
    for (const e of MODEL_ESSAYS) {
      const said = e.paragraphs.flatMap((p) => p.notes).map((n) => n.note.match(/About (\d+) words/)?.[1]).find(Boolean);
      if (said) expect(Math.abs(Number(said) - essayWordCount(e)), e.id).toBeLessThanOrEqual(15);
    }
  });
});

describe("guide data", () => {
  it("blueprint minutes fill the 35-minute clock and the clock column counts down correctly", () => {
    expect(BLUEPRINT.reduce((a, b) => a + b.minutes, 0) * 60).toBe(WRITE_SEC);
    let left = WRITE_SEC / 60;
    for (const b of BLUEPRINT) {
      left -= b.minutes;
      expect(b.clock, b.part).toBe(`${left}:00`);
    }
  });
  it("rubric has six criteria with three levels and upgrades differ", () => {
    expect(RUBRIC.length).toBe(6);
    for (const u of UPGRADES) expect(u.weak).not.toBe(u.strong);
  });
  it("highlightRuns splits text around quotes in order and skips missing ones", () => {
    const runs = highlightRuns("one two three four", ["three", "one", "nope"]);
    expect(runs).toEqual([
      { text: "one", mark: true },
      { text: " two ", mark: false },
      { text: "three", mark: true },
      { text: " four", mark: false },
    ]);
    expect(runs.map((r) => r.text).join("")).toBe("one two three four");
  });
});
