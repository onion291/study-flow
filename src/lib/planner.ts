// Pure plan-generation logic. Dates are "YYYY-MM-DD" strings in Korea time (KST).

export type UnitType = "page" | "problem" | "day";

export interface WeekdaySetting {
  weekday: number; // 0 = Sunday
  is_rest: boolean;
  subject_ids: string[];
}

export interface PlanSlot {
  date: string;
  unit_start: number;
  unit_end: number;
}

export type PlanResult =
  | { ok: true; items: PlanSlot[]; availableDays: number }
  | {
      ok: false;
      reason: "no_days" | "too_short";
      availableDays: number;
      neededDays: number;
      neededPerDay: number;
    };

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
export const UNIT_LABEL: Record<UnitType, string> = { page: "페이지", problem: "문제", day: "DAY" };

export function todayKST(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function toUTC(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: string, n: number): string {
  return new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10);
}

export function weekdayOf(d: string): number {
  return new Date(toUTC(d)).getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function formatDate(d: string): string {
  return d.replaceAll("-", ".");
}

export function formatRange(type: UnitType, start: number, end: number): string {
  if (type === "day") return start === end ? `DAY ${start}` : `DAY ${start}~${end}`;
  const label = type === "page" ? "페이지" : "번";
  return start === end ? `${start}${label}` : `${start}~${end}${label}`;
}

/** Dates in [start, end] whose weekday is a study day that includes the subject. */
export function studyDates(
  start: string,
  end: string,
  subjectId: string | null,
  settings: WeekdaySetting[],
): string[] {
  const out: string[] = [];
  if (!subjectId || start > end) return out;
  const map = new Map(settings.map((s) => [s.weekday, s]));
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const s = map.get(weekdayOf(d));
    if (s && !s.is_rest && s.subject_ids.includes(subjectId)) out.push(d);
  }
  return out;
}

/**
 * Distribute `remaining` units starting at `nextUnit` over `dates`.
 * page/problem: as even as possible; the first (remaining % days) days get one extra unit.
 * day: `unitsPerDay` DAYs per study day, in order.
 */
export function generatePlan(opts: {
  nextUnit: number;
  remaining: number;
  dates: string[];
  unitType: UnitType;
  unitsPerDay?: number;
  maxPerDay?: number | null;
}): PlanResult {
  const { nextUnit, remaining, dates, unitType } = opts;
  const n = dates.length;
  if (remaining <= 0) return { ok: true, items: [], availableDays: n };
  if (n === 0)
    return { ok: false, reason: "no_days", availableDays: 0, neededDays: 1, neededPerDay: remaining };

  const items: PlanSlot[] = [];
  let cursor = nextUnit;

  if (unitType === "day") {
    const per = Math.max(1, opts.unitsPerDay ?? 1);
    const needed = Math.ceil(remaining / per);
    if (needed > n)
      return {
        ok: false,
        reason: "too_short",
        availableDays: n,
        neededDays: needed,
        neededPerDay: Math.ceil(remaining / n),
      };
    let left = remaining;
    for (let i = 0; i < needed; i++) {
      const amt = Math.min(per, left);
      items.push({ date: dates[i], unit_start: cursor, unit_end: cursor + amt - 1 });
      cursor += amt;
      left -= amt;
    }
    return { ok: true, items, availableDays: n };
  }

  const perDayNeeded = Math.ceil(remaining / n);
  if (opts.maxPerDay && opts.maxPerDay > 0 && perDayNeeded > opts.maxPerDay)
    return {
      ok: false,
      reason: "too_short",
      availableDays: n,
      neededDays: Math.ceil(remaining / opts.maxPerDay),
      neededPerDay: perDayNeeded,
    };

  const base = Math.floor(remaining / n);
  const extra = remaining % n;
  for (let i = 0; i < n; i++) {
    const amt = base + (i < extra ? 1 : 0);
    if (amt <= 0) continue;
    items.push({ date: dates[i], unit_start: cursor, unit_end: cursor + amt - 1 });
    cursor += amt;
  }
  return { ok: true, items, availableDays: n };
}

export const slotAmount = (s: { unit_start: number; unit_end: number }) => s.unit_end - s.unit_start + 1;

/** Daily load above which a date is flagged as overloaded. */
export const OVERLOAD_LIMIT: Record<UnitType, number> = { page: 40, problem: 60, day: 3 };
