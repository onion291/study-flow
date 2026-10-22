import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { UnitType, WeekdaySetting } from "./planner";

export type Subject = Tables<"subjects">;
export type Textbook = Omit<Tables<"textbooks">, "unit_type" | "day_ranges"> & {
  unit_type: UnitType;
  day_ranges: Record<string, string>;
};
export type PlanItem = Tables<"plan_items">;

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const keys = {
  subjects: ["subjects"] as const,
  weekdays: ["weekdays"] as const,
  textbooks: ["textbooks"] as const,
  items: ["plan_items"] as const,
};

export function useSubjects() {
  return useQuery({
    queryKey: keys.subjects,
    queryFn: async () =>
      check(await supabase.from("subjects").select("*").order("created_at")) as Subject[],
  });
}

export function useWeekdays() {
  return useQuery({
    queryKey: keys.weekdays,
    queryFn: async () => {
      const rows = check(await supabase.from("weekday_settings").select("*")) as WeekdaySetting[];
      return [0, 1, 2, 3, 4, 5, 6].map(
        (w) => rows.find((r) => r.weekday === w) ?? { weekday: w, is_rest: false, subject_ids: [] },
      );
    },
  });
}

export function useTextbooks() {
  return useQuery({
    queryKey: keys.textbooks,
    queryFn: async () =>
      check(await supabase.from("textbooks").select("*").order("end_date")) as unknown as Textbook[],
  });
}

export function usePlanItems() {
  return useQuery({
    queryKey: keys.items,
    queryFn: async () => {
      const all: PlanItem[] = [];
      for (let from = 0; ; from += 1000) {
        const page = check(
          await supabase.from("plan_items").select("*").order("date").order("unit_start").range(from, from + 999),
        ) as PlanItem[];
        all.push(...page);
        if (page.length < 1000) break;
      }
      return all;
    },
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useSetCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: number }) => {
      check(await supabase.from("plan_items").update({ completed_amount: completed }).eq("id", id).select());
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: keys.items });
      const prev = qc.getQueryData<PlanItem[]>(keys.items);
      qc.setQueryData<PlanItem[]>(keys.items, (old) =>
        old?.map((i) => (i.id === id ? { ...i, completed_amount: completed } : i)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(keys.items, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.items }),
  });
}
