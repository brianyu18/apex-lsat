import { describe, expect, it } from "vitest";
import { buildTrack, parsePtList } from "@/lib/planner/official-track";
import type { PlanDay } from "@/lib/planner/generate";

const ptDay = (day: string): PlanDay => ({ day, phase: "mixed", minutes: 180, blocks: [{ kind: "pt", minutes: 150, label: "Full practice test" }] });
const plain = (day: string): PlanDay => ({ day, phase: "mixed", minutes: 60, blocks: [{ kind: "drill", minutes: 60, label: "drill" }] });

describe("official PT track", () => {
  it("parses ranges and lists", () => {
    expect(parsePtList("150-153, 158 160")).toEqual([150, 151, 152, 153, 158, 160]);
    expect(parsePtList("")).toEqual([]);
  });
  it("schedules oldest first, reserves the newest for the final PT days, falls back to simulated", () => {
    const days = ["2027-01-02", "2027-01-09", "2027-01-16", "2027-01-23", "2027-01-30", "2027-02-06"].map(ptDay).concat([plain("2027-01-05")]);
    const t = buildTrack([150, 151, 152, 153, 158], days, [], "2027-01-01");
    const sched = t.entries.filter((e) => e.status === "scheduled").map((e) => e.pt);
    expect(sched).toEqual([150, 151, 152, 153, 158]);
    expect(t.entries[t.entries.length - 1]).toMatchObject({ pt: 158, status: "scheduled" }); // newest last
    expect(t.entries.filter((e) => e.status === "simulated")).toHaveLength(1); // 6 PT days, 5 tests
    expect(t.remaining).toEqual([]);
  });
  it("marks taken tests on past PT days and keeps extras", () => {
    const days = ["2027-01-02", "2027-01-09", "2027-01-16"].map(ptDay);
    const t = buildTrack([150, 151, 152, 153], days, [{ pt: 150, scaled: 165, takenAt: "2027-01-03" }, { pt: 153, scaled: 170, takenAt: "2026-12-20" }], "2027-01-10");
    expect(t.entries[0]).toMatchObject({ pt: 150, status: "taken", scaled: 165 });
    expect(t.entries[1].status).toBe("simulated"); // past day, no matching test
    expect(t.entries[2]).toMatchObject({ status: "scheduled" });
    expect(t.extra.map((e) => e.pt)).toEqual([153]);
    expect(t.takenCount).toBe(2);
    expect(t.remaining.length + t.entries.filter((e) => e.status === "scheduled").length).toBe(2); // 151, 152 left
  });
});
