import { describe, expect, it } from "vitest";
import sample from "../fixtures/schools-sample.json";
import { goalFromTargets, odds, type School } from "@/lib/schools/odds";
import { parse509 } from "@/lib/schools/ingest";

const schools = sample as School[];
const elite = schools[0], state = schools[1], regional = schools[2];

describe("school odds", () => {
  it("bands follow position against the medians", () => {
    expect(odds(elite, 165, 3.6).band).toBe("long_shot");
    expect(odds(elite, 176, 3.95).band).toMatch(/target|likely/);
    expect(odds(state, 170, 3.8).band).toBe("likely");
    expect(odds(regional, 160, 3.5).band).toBe("likely");
    expect(odds(state, 155, 3.2).band).toMatch(/reach|long_shot/);
  });
  it("probability rises monotonically with LSAT and with GPA", () => {
    const ps = [160, 165, 170, 175, 180].map((l) => odds(elite, l, 3.8).probability);
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThanOrEqual(ps[i - 1]);
    expect(odds(state, 164, 3.9).probability).toBeGreaterThan(odds(state, 164, 3.3).probability);
  });
  it("reports the LSAT needed for target and likely, and class percentiles", () => {
    const o = odds(elite, 168, 3.9);
    expect(o.lsatForTarget).not.toBeNull();
    expect(o.lsatForTarget!).toBeGreaterThan(168);
    expect(o.lsatForLikely!).toBeGreaterThanOrEqual(o.lsatForTarget!);
    expect(o.lsatPercentile).toBeLessThan(25);
    expect(odds(state, 164, null).gpaPercentile).toBeNull();
  });
  it("goal from targets is the most selective median", () => {
    expect(goalFromTargets([state, elite])).toBe(173);
    expect(goalFromTargets([])).toBeNull();
  });
});

describe("509 ingest", () => {
  it("maps fuzzy headers and skips incomplete rows", () => {
    const rows = [
      { "School Name": "Fictional Law School", State: "ca", "LSAT 25th Percentile": "158", "LSAT 50th Percentile": "161", "LSAT 75th Percentile": "164", "UGPA 25th": "3.4", "UGPA Median": "3.6", "UGPA 75th": "3.8", Applications: "2,100", Offers: "700", Matriculants: "190" },
      { "School Name": "Incomplete U", State: "NY", "LSAT 25th Percentile": "", "LSAT 50th Percentile": "160", "LSAT 75th Percentile": "", "UGPA 25th": "", "UGPA Median": "", "UGPA 75th": "" },
    ];
    const r = parse509(rows, 2025);
    expect(r.schools).toHaveLength(1);
    expect(r.schools[0]).toMatchObject({ id: "fictional-law-school", state: "CA", lsat50: 161, gpa50: 3.6, applicants: 2100, offers: 700, tags: ["ca"] });
    expect(r.skipped).toEqual([{ name: "Incomplete U", reason: "missing percentile data" }]);
  });
});
