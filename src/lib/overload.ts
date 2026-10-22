import { OVERLOAD_LIMIT, slotAmount, UNIT_LABEL, type UnitType } from "./planner";

/** Per-date warnings when the combined load across textbooks exceeds OVERLOAD_LIMIT. */
export function overloadedDates(
  items: { date: string; unit_start: number; unit_end: number; textbook_id: string }[],
  typeOf: (textbookId: string) => UnitType | undefined,
): Map<string, string> {
  const sums = new Map<string, Record<UnitType, number>>();
  for (const i of items) {
    const t = typeOf(i.textbook_id);
    if (!t) continue;
    const s = sums.get(i.date) ?? { page: 0, problem: 0, day: 0 };
    s[t] += slotAmount(i);
    sums.set(i.date, s);
  }
  const out = new Map<string, string>();
  for (const [date, s] of sums) {
    const over = (Object.keys(s) as UnitType[]).filter((k) => s[k] > OVERLOAD_LIMIT[k]);
    if (over.length) out.set(date, over.map((k) => `${UNIT_LABEL[k]} ${s[k]}`).join(", "));
  }
  return out;
}
