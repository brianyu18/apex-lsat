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
});
