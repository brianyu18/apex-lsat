import { describe, expect, it } from "vitest";
import { hoursNeeded, intensityFor } from "@/lib/planner/intensity";
import { administrationFor, upcomingAdministrations } from "@/lib/planner/lsat-dates";

describe("intensity", () => {
  it("points cost more at the top", () => {
    expect(hoursNeeded(165, 170)).toBe(5 * 14);
    expect(hoursNeeded(170, 175)).toBe(5 * 20);
    expect(hoursNeeded(155, 160)).toBe(40 + 5 * 10);
    expect(hoursNeeded(null, 160)).toBe(40 + 10 * 10);
  });
  it("recommends hours from the gap and weeks, with labels", () => {
    const far = intensityFor({ from: 162, goal: 175, today: "2026-10-28", testDate: "2027-06-09", currentHoursPerWeek: 10 });
    const near = intensityFor({ from: 162, goal: 175, today: "2026-10-28", testDate: "2027-01-13", currentHoursPerWeek: 10 });
    expect(far.hoursNeeded).toBe(8 * 14 + 5 * 20);
    expect(far.hoursPerWeek).toBeLessThan(near.hoursPerWeek);
    expect(far.label).toMatch(/relaxed|standard/);
    expect(near.feasible).toBe(near.hoursPerWeek <= 25);
    expect(near.expectedGainAtCurrentHours!).toBeLessThan(far.expectedGainAtCurrentHours!);
  });
  it("maintenance floor when the gap is closed", () => {
    expect(intensityFor({ from: 176, goal: 175, today: "2026-10-28", testDate: "2027-04-08" }).hoursPerWeek).toBe(6);
  });
});

describe("LSAT administrations", () => {
  it("lists upcoming dates with registrability", () => {
    const up = upcomingAdministrations("2026-10-28");
    expect(up[0].id).toBe("2026-11");
    expect(up[0].registrable).toBe(false); // Oct 1 deadline passed
    expect(up[1]).toMatchObject({ id: "2027-01", registrable: true });
    expect(administrationFor("2027-04-09")?.label).toBe("April 2027");
    expect(administrationFor("2027-05-01")).toBeNull();
  });
});
