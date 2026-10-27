import { describe, expect, it } from "vitest";
import { detectBottlenecks } from "@/lib/engine/bottleneck";

const miss = (type: string, tags: string[] = []) => ({ type, logicTags: tags });
const att = (type: string, correct: boolean, tags: string[] = []) => ({ type, logicTags: tags, correct, counted: true });

describe("detectBottlenecks", () => {
  it("needs at least 8 misses", () => {
    expect(detectBottlenecks([miss("flaw"), miss("flaw"), miss("flaw")], [])).toEqual([]);
  });
  it("flags a type over 30% of misses and reports rolling accuracy", () => {
    const misses = [...Array(4).fill(miss("flaw", ["causation"])), miss("weaken"), miss("strengthen"), miss("necessary_assumption"), miss("main_conclusion"), miss("parallel_flaw"), miss("evaluate")];
    const recent = [...Array(10).fill(att("flaw", false)), ...Array(10).fill(att("flaw", true))];
    const b = detectBottlenecks(misses, recent);
    expect(b[0]).toMatchObject({ dimension: "type", key: "flaw", misses: 4, share: 0.4, rollingAccuracy: 0.5, cleared: false });
    expect(b.find((x) => x.dimension === "tag" && x.key === "causation")).toMatchObject({ share: 0.4 });
  });
  it("clears after 20 counted attempts above 85%", () => {
    const misses = [...Array(5).fill(miss("flaw")), ...Array(5).fill(miss("weaken"))];
    const recent = [...Array(2).fill(att("flaw", false)), ...Array(18).fill(att("flaw", true))];
    const b = detectBottlenecks(misses, recent);
    expect(b.find((x) => x.key === "flaw")).toMatchObject({ cleared: true, rollingAccuracy: 0.9 });
  });
});
