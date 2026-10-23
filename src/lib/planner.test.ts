import { describe, it, expect } from "vitest";
import { generatePlan, studyDates, slotAmount, todayKST, weekdayOf, type WeekdaySetting } from "./planner";

const MATH = "math";
const mwf: WeekdaySetting[] = [0, 1, 2, 3, 4, 5, 6].map((w) => ({
  weekday: w,
  is_rest: w === 0,
  subject_ids: [1, 3, 5].includes(w) ? [MATH] : ["eng"],
}));

describe("planner", () => {
  it("only uses Mon/Wed/Fri study days for 2026.10.23~2026.11.21", () => {
    const dates = studyDates("2026-10-23", "2026-11-21", MATH, mwf);
    expect(dates.every((d) => [1, 3, 5].includes(weekdayOf(d)))).toBe(true);
    expect(dates[0]!).toBe("2026-10-23");
    expect(dates.length).toBe(13);
  });

  it("distributes 240 pages exactly with no gaps", () => {
    const dates = studyDates("2026-10-23", "2026-11-21", MATH, mwf);
    const r = generatePlan({ nextUnit: 1, remaining: 240, dates, unitType: "page" });
    if (!r.ok) throw new Error();
    expect(r.items.reduce((s, i) => s + slotAmount(i), 0)).toBe(240);
    expect(r.items[0]!.unit_start).toBe(1);
    expect(r.items.at(-1)!.unit_end).toBe(240);
    const amts = r.items.map(slotAmount);
    expect(Math.max(...amts) - Math.min(...amts)).toBeLessThanOrEqual(1);
  });

  it("skips already-completed units", () => {
    const r = generatePlan({ nextUnit: 51, remaining: 50, dates: ["2026-10-23", "2026-10-26"], unitType: "page" });
    if (!r.ok) throw new Error();
    expect(r.items).toEqual([
      { date: "2026-10-23", unit_start: 51, unit_end: 75 },
      { date: "2026-10-26", unit_start: 76, unit_end: 100 },
    ]);
  });

  it("rest days and unassigned subjects yield no dates", () => {
    expect(studyDates("2026-10-25", "2026-10-25", MATH, mwf)).toEqual([]); // Sunday rest
    expect(studyDates("2026-10-27", "2026-10-27", MATH, mwf)).toEqual([]); // Tuesday, no math
  });

  it("includes both boundary dates", () => {
    expect(studyDates("2026-10-23", "2026-10-26", MATH, mwf)).toEqual(["2026-10-23", "2026-10-26"]);
  });

  it("reports no study days instead of failing", () => {
    const r = generatePlan({ nextUnit: 1, remaining: 10, dates: [], unitType: "page" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_days");
  });

  it("DAY mode assigns one DAY per study day and detects shortage", () => {
    const ok = generatePlan({ nextUnit: 1, remaining: 3, dates: ["a", "b", "c", "d"], unitType: "day" });
    if (!ok.ok) throw new Error();
    expect(ok.items.map((i) => i.unit_start)).toEqual([1, 2, 3]);
    const bad = generatePlan({ nextUnit: 1, remaining: 5, dates: ["a", "b"], unitType: "day" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.neededDays - bad.availableDays).toBe(3);
  });

  it("respects daily max and reports needed days", () => {
    const r = generatePlan({ nextUnit: 1, remaining: 100, dates: ["a", "b"], unitType: "page", maxPerDay: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.neededDays).toBe(5);
  });

  it("uses Korea time for today", () => {
    expect(todayKST(new Date("2026-10-22T15:30:00Z"))).toBe("2026-10-23");
  });
});
