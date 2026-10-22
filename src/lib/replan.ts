import { generatePlan, studyDates, type PlanResult, type UnitType, type WeekdaySetting } from "./planner";

export interface TextbookLike {
  id: string;
  subject_id: string | null;
  unit_type: UnitType;
  start_unit: number;
  end_unit: number;
  initial_completed: number;
  start_date: string;
  end_date: string;
  units_per_day: number;
  max_per_day: number | null;
}

export interface ItemLike {
  id: string;
  date: string;
  unit_start: number;
  unit_end: number;
  completed_amount: number;
}

export const totalUnits = (t: Pick<TextbookLike, "start_unit" | "end_unit">) =>
  Math.max(0, t.end_unit - t.start_unit + 1);

export function completedUnits(t: TextbookLike, items: ItemLike[]) {
  return Math.min(totalUnits(t), t.initial_completed + items.reduce((s, i) => s + i.completed_amount, 0));
}

/**
 * Recompute the remaining schedule.
 * - Items with completed work are kept (trimmed to the completed amount and renumbered in order).
 * - Items without completed work are removed and the remaining amount is spread from `fromDate`.
 * Completed records are never changed in amount.
 */
export function computeReplan(
  t: TextbookLike,
  items: ItemLike[],
  settings: WeekdaySetting[],
  fromDate: string,
): {
  keep: ItemLike[];
  remove: string[];
  remaining: number;
  result: PlanResult;
} {
  const done = [...items].filter((i) => i.completed_amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const remove = items.filter((i) => i.completed_amount <= 0).map((i) => i.id);
  let cursor = t.start_unit + t.initial_completed;
  const keep = done.map((i) => {
    const k = { ...i, unit_start: cursor, unit_end: cursor + i.completed_amount - 1 };
    cursor += i.completed_amount;
    return k;
  });
  const remaining = Math.max(0, t.end_unit - cursor + 1);
  const start = fromDate > t.start_date ? fromDate : t.start_date;
  const used = new Set(keep.map((k) => k.date));
  const dates = studyDates(start, t.end_date, t.subject_id, settings).filter((d) => !used.has(d));
  const result = generatePlan({
    nextUnit: cursor,
    remaining,
    dates,
    unitType: t.unit_type,
    unitsPerDay: t.units_per_day,
    maxPerDay: t.max_per_day,
  });
  return { keep, remove, remaining, result };
}
