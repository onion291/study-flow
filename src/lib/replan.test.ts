import { describe, it, expect } from "vitest";
import { computeReplan, type TextbookLike } from "./replan";
import type { WeekdaySetting } from "./planner";

const settings: WeekdaySetting[] = [0, 1, 2, 3, 4, 5, 6].map((w) => ({
  weekday: w,
  is_rest: false,
  subject_ids: ["s"],
}));
const tb: TextbookLike = {
  id: "t",
  subject_id: "s",
  unit_type: "page",
  start_unit: 1,
  end_unit: 40,
  initial_completed: 0,
  start_date: "2026-10-20",
  end_date: "2026-10-27",
  units_per_day: 1,
  max_per_day: null,
};

describe("redistribution", () => {
  it("keeps completed work and spreads only what is left", () => {
    const items = [
      { id: "a", date: "2026-10-20", unit_start: 1, unit_end: 5, completed_amount: 5 },
      { id: "b", date: "2026-10-21", unit_start: 6, unit_end: 10, completed_amount: 2 },
      { id: "c", date: "2026-10-22", unit_start: 11, unit_end: 15, completed_amount: 0 },
    ];
    const r = computeReplan(tb, items, settings, "2026-10-23");
    expect(r.remove).toEqual(["c"]);
    expect(r.keep.map((k) => [k.unit_start, k.unit_end])).toEqual([[1, 5], [6, 7]]);
    expect(r.remaining).toBe(33);
    if (!r.result.ok) throw new Error();
    expect(r.result.items[0].unit_start).toBe(8);
    expect(r.result.items.at(-1)!.unit_end).toBe(40);
    expect(r.result.items[0].date).toBe("2026-10-23");
  });
});
