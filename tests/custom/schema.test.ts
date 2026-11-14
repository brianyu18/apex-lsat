import { describe, expect, it } from "vitest";
import { parseCustomTest, TEMPLATE } from "@/lib/custom/schema";

describe("apex-test/1", () => {
  it("accepts the template and summarizes it", () => {
    const r = parseCustomTest(JSON.stringify(TEMPLATE));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.summary.questions).toBe(3);
      expect(r.summary.sections.map((s) => s.kind)).toEqual(["LR", "RC"]);
    }
  });
  it("minimal question needs only stimulus, stem, choices, answer", () => {
    const t = { format: "apex-test/1", title: "t", sections: [{ kind: "LR", questions: [{ stimulus: "s", stem: "q", choices: { A: "a", B: "b", C: "c", D: "d", E: "e" }, answer: "D" }] }] };
    const r = parseCustomTest(JSON.stringify(t));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.test.sections[0]).toMatchObject({ scored: true, minutes: 35 });
  });
  it("reports precise errors", () => {
    const bad = { format: "apex-test/1", title: "t", sections: [{ kind: "LR", questions: [{ stimulus: "s", stem: "q", choices: { A: "a", B: "b", C: "c", D: "d" }, answer: "F", extra: 1 }] }] };
    const r = parseCustomTest(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/sections\.0\.questions\.0\.choices\.E/);
    expect(parseCustomTest("{nope").ok).toBe(false);
    expect(parseCustomTest(JSON.stringify({ format: "other", title: "t", sections: [] })).ok).toBe(false);
  });
  const q = (extra: object = {}) => ({ stimulus: "s", stem: "q", choices: { A: "a", B: "b", C: "c", D: "d", E: "e" }, answer: "A", ...extra });
  const rq = (extra: object = {}) => ({ stem: "q", choices: { A: "a", B: "b", C: "c", D: "d", E: "e" }, answer: "A", ...extra });
  const parse = (t: object) => parseCustomTest(JSON.stringify({ format: "apex-test/1", title: "t", ...t }));
  it("accepts the indexing fields and null placeholders", () => {
    const r = parse({
      id: "X-1", number: 0, year: 2024, description: "d", totals: { sections: 2, questions: 2, scoredQuestions: 2 },
      sections: [
        { id: "X-1-S1", order: 1, kind: "LR", directions: "d", credits: ["c"], questions: [q({ number: 1, id: "X-1-S1-Q01", type: "Weaken", category: "c", skill: "s", difficulty: 5 })] },
        { id: "X-1-S2", order: 2, kind: "RC", passages: [{ id: "P1", title: null, subject: "Law", comparative: false, paragraphs: ["alpha beta", "gamma"], credits: ["c"], questions: [rq({ number: 1, id: "X-1-S2-Q01", type: "Made Up", reference: { text: "beta", paragraph: 0 } })] }] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.summary.label).toBe("#0 · 2024 · X-1");
      expect(r.summary.warnings.join(" ")).toMatch(/RC "Made Up".*unclassified/);
    }
  });
  it("sorts sections by order", () => {
    const r = parse({ sections: [{ order: 2, kind: "LR", questions: [q()] }, { order: 1, kind: "RC", passages: [{ paragraphs: ["p"], questions: [rq()] }] }] });
    expect(r.ok && r.test.sections.map((s) => s.kind)).toEqual(["RC", "LR"]);
  });
  it("rejects inconsistent totals, numbering, ids and references", () => {
    const errs = (t: object) => {
      const r = parse(t);
      return r.ok ? "" : r.errors.join("\n");
    };
    expect(errs({ totals: { questions: 3 }, sections: [{ kind: "LR", questions: [q()] }] })).toMatch(/totals\.questions says 3, the file has 1/);
    expect(errs({ sections: [{ kind: "LR", questions: [q({ number: 1 }), q({ number: 3 })] }] })).toMatch(/must run 1…2/);
    expect(errs({ sections: [{ kind: "LR", questions: [q({ id: "a" }), q({ id: "a" })] }] })).toMatch(/question id: "a"/);
    expect(errs({ sections: [{ order: 1, kind: "LR", questions: [q()] }, { kind: "LR", questions: [q()] }] })).toMatch(/every section an order/);
    expect(errs({ sections: [{ kind: "RC", passages: [{ comparative: true, paragraphs: ["p"], questions: [rq()] }] }] })).toMatch(/paragraphsB is missing/);
    expect(errs({ sections: [{ kind: "RC", passages: [{ paragraphs: ["p"], questions: [rq({ reference: { text: "p", paragraph: 4 } })] }] }] })).toMatch(/past the last paragraph/);
  });
});
