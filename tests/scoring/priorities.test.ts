import { describe, expect, it } from "vitest";
import { pointsOnTable, rankPriorities, shrinkAccuracy } from "@/lib/scoring/priorities";

describe("priorities", () => {
  it("ranks by expected lost points, with thin samples last", () => {
    const rows = rankPriorities([
      { key: "flaw", label: "Flaw", dimension: "type", n: 40, correct: 24, perTest: 7.7 }, // 60% on a frequent type
      { key: "parallel", label: "Parallel", dimension: "type", n: 40, correct: 8, perTest: 1.6 }, // 20% on a rare type
      { key: "mbt", label: "MBT", dimension: "type", n: 3, correct: 0, perTest: 3 }, // thin
      { key: "mss", label: "MSS", dimension: "type", n: 50, correct: 48, perTest: 4.9 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["flaw", "parallel", "mss", "mbt"]);
    expect(rows[3].status).toBe("thin");
    expect(rows[0].lostPerTest).toBeGreaterThan(rows[1].lostPerTest);
    expect(pointsOnTable(rows)).toBeGreaterThan(0);
  });
  it("shrinks small samples toward the prior", () => {
    expect(shrinkAccuracy(0, 1)).toBeGreaterThan(0.5);
    expect(shrinkAccuracy(0, 100)).toBeLessThan(0.05);
  });
});
