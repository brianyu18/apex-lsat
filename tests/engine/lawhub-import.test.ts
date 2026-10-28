import { describe, expect, it } from "vitest";
import { parseLawHub, summarize } from "@/lib/import/lawhub";

describe("parseLawHub", () => {
  it("parses the simple grid format with triples and marks the experimental section", () => {
    const t = parseLawHub(`PT 158
S1 LR: 1 A A, 2 C B, 3 D D
S2 RC: 1 B B, 2 ✓, 3 ✗
S3 LR (experimental): 1 A A, 2 B B
S4 LR: 1 A A, 2 B B 95s, 3 C D 2:10`);
    expect(t.pt).toBe(158);
    expect(t.sections).toHaveLength(4);
    expect(t.sections[0].questions[1]).toMatchObject({ yourAnswer: "C", key: "B", correct: false });
    expect(t.sections[1].questions[1]).toMatchObject({ correct: true, yourAnswer: null });
    expect(t.sections[2].scored).toBe(false);
    expect(t.sections[3].questions[1].seconds).toBe(95);
    expect(t.sections[3].questions[2].seconds).toBe(130);
    const s = summarize(t);
    expect(s.total).toBe(9); // scored only
    expect(s.correct).toBe(6);
  });
  it("parses a CSV score report", () => {
    const t = parseLawHub(`Section,Question,Your Answer,Correct Answer,Time
Section 1 (LR),1,A,A,1:05
Section 1 (LR),2,B,C,0:50
Section 2 (RC),1,D,D,2:00`, { pt: 157 });
    expect(t.pt).toBe(157);
    expect(t.sections).toHaveLength(2);
    expect(t.sections[0].questions[1]).toMatchObject({ correct: false, seconds: 50 });
    expect(t.sections[1].kind).toBe("RC");
  });
  it("errors without a PT number or questions", () => {
    expect(() => parseLawHub("S1 LR: 1 A A")).toThrow(/PrepTest number/);
    expect(() => parseLawHub("PT 158")).toThrow(/No questions/);
  });
});
