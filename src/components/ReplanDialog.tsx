import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlanPreview } from "@/components/PlanPreview";
import { persistPlan, type PlanItem, type Textbook, useWeekdays, usePlanItems, useTextbooks } from "@/lib/data";
import { computeReplan, suggestEndDate } from "@/lib/replan";
import { overloadedDates } from "@/lib/overload";
import { slotAmount, todayKST, UNIT_LABEL } from "@/lib/planner";

export function ReplanDialog({ textbook, items }: { textbook: Textbook; items: PlanItem[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: weekdays = [] } = useWeekdays();
  const { data: allItems = [] } = usePlanItems();
  const { data: textbooks = [] } = useTextbooks();
  const today = todayKST();
  const unit = UNIT_LABEL[textbook.unit_type];

  const r = useMemo(() => {
    if (!open) return null;
    const res = computeReplan(textbook, items, weekdays, today);
    const suggested = res.result.ok ? null : suggestEndDate(textbook, items, weekdays, today);
    const removed = new Set(res.remove);
    const others = allItems.filter((i) => !removed.has(i.id) && i.textbook_id !== textbook.id);
    const mineNew = res.result.ok ? res.result.items.map((s) => ({ ...s, textbook_id: textbook.id })) : [];
    const typeOf = (id: string) => textbooks.find((t) => t.id === id && t.status === "active")?.unit_type;
    const before = items.filter((i) => i.completed_amount < slotAmount(i) && i.date >= today);
    const overdue = items.filter((i) => i.completed_amount < slotAmount(i) && i.date < today);
    return { ...res, suggested, overloads: overloadedDates([...others, ...mineNew], typeOf), before, overdue };
  }, [open, textbook, items, weekdays, allItems, textbooks, today]);

  async function save() {
    if (!r?.result.ok) return;
    setSaving(true);
    try {
      await persistPlan(textbook.id, r.keep, r.remove, r.result.items);
      await qc.invalidateQueries();
      toast.success("남은 분량을 재분배했어요.");
      setOpen(false);
    } catch {
      toast.error("저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent"><RefreshCw /> 남은 분량 재분배</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>남은 분량 재분배</DialogTitle></DialogHeader>
        {r && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              실제로 완료한 분량을 기준으로, 오늘부터 목표 완료일까지 공부하는 요일에 다시 나눕니다. 완료 기록은 그대로 유지돼요.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">재분배 전</p>
                <p className="mt-1">남은 일정 {r.before.length}일 · 하루 평균 {avg(r.before.map((i) => slotAmount(i) - i.completed_amount))}{unit}</p>
                {r.overdue.length > 0 && <p className="mt-1 text-destructive">밀린 일정 {r.overdue.length}일</p>}
              </div>
              <div className="rounded-xl border border-accent/40 bg-secondary p-3">
                <p className="text-xs text-muted-foreground">재분배 후</p>
                {r.result.ok ? (
                  <p className="mt-1">남은 일정 {r.result.items.length}일 · 하루 평균 {avg(r.result.items.map(slotAmount))}{unit}</p>
                ) : (
                  <p className="mt-1 text-destructive">기간 내 불가</p>
                )}
              </div>
            </div>
            <PlanPreview result={r.result} unitType={textbook.unit_type} remaining={r.remaining} overloads={r.overloads} suggestedEnd={r.suggested} />
            {r.result.ok && (
              <Button onClick={save} disabled={saving} className="w-full">이대로 저장하기</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
