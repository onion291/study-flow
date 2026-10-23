import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlanItemRow } from "@/components/PlanItemRow";
import { cn } from "@/lib/utils";
import { keys, usePlanItems, useSubjects, useTextbooks, type PlanItem } from "@/lib/data";
import { addDays, formatDate, slotAmount, todayKST, WEEKDAY_LABELS, weekdayOf } from "@/lib/planner";
import { overloadedDates } from "@/lib/overload";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "학습 달력 · StudyFlow" }, { name: "description", content: "월간 학습 일정과 날짜별 목록" }, { property: "og:title", content: "학습 달력 · StudyFlow" }, { property: "og:description", content: "월간 학습 일정" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const today = todayKST();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const { data: items = [] } = usePlanItems();
  const { data: textbooks = [] } = useTextbooks();
  const { data: subjects = [] } = useSubjects();
  const byId = new Map(textbooks.map((t) => [t.id, t]));
  const visible = items.filter((i) => byId.get(i.textbook_id)?.status === "active");
  const overloads = overloadedDates(visible, (id) => byId.get(id)?.unit_type);

  const first = `${month}-01`;
  const gridStart = addDays(first, -weekdayOf(first));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const dayItems = visible.filter((i) => i.date === selected);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="card-soft p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="이전 달"><ChevronLeft /></Button>
          <h1 className="text-lg font-bold">{month.replace("-", ".")}</h1>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="다음 달"><ChevronRight /></Button>
        </div>
        <div className="mt-3 grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEKDAY_LABELS.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const list = visible.filter((i) => i.date === d);
            const doneN = list.filter((i) => i.completed_amount >= slotAmount(i)).length;
            const allDone = list.length > 0 && doneN === list.length;
            const missed = list.length > 0 && !allDone && d < today;
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={cn(
                  "flex min-h-16 flex-col items-start rounded-lg border p-1.5 text-left text-xs transition-colors sm:min-h-20",
                  !d.startsWith(month) && "opacity-40",
                  d === selected ? "border-accent bg-secondary" : "border-transparent hover:bg-muted",
                )}
              >
                <span className={cn("font-medium", d === today && "rounded-full bg-primary px-1.5 text-primary-foreground")}>{Number(d.slice(8))}</span>
                {list.length > 0 && (
                  <span className={cn("mt-auto rounded px-1 py-0.5 text-[10px]", allDone ? "bg-success/15 text-success" : missed ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent")}>
                    {doneN}/{list.length}
                  </span>
                )}
                {overloads.has(d) && <AlertTriangle className="mt-0.5 h-3 w-3 text-warning" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span><span className="text-success">■</span> 모두 완료</span>
          <span><span className="text-accent">■</span> 예정</span>
          <span><span className="text-destructive">■</span> 미완료</span>
          <span><AlertTriangle className="inline h-3 w-3 text-warning" /> 학습량 많음</span>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">{formatDate(selected)} ({WEEKDAY_LABELS[weekdayOf(selected)]})</h2>
        {overloads.get(selected) && <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning-foreground">이 날 학습량이 많아요 ({overloads.get(selected)}). 연필 버튼으로 일부를 다른 날로 옮길 수 있어요.</p>}
        {dayItems.length === 0 && <p className="card-soft p-5 text-sm text-muted-foreground">이 날짜에는 학습 일정이 없습니다.</p>}
        {dayItems.map((i) => {
          const t = byId.get(i.textbook_id)!;
          return <PlanItemRow key={i.id} item={i} textbook={t} subject={subjects.find((s) => s.id === t.subject_id)?.name} onEdit={() => setEditing(i)} />;
        })}
      </section>
      {editing && <EditItemDialog item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditItemDialog({ item, onClose }: { item: PlanItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(item.date);
  const [start, setStart] = useState(String(item.unit_start));
  const [end, setEnd] = useState(String(item.unit_end));

  async function save() {
    const s = Number(start), e = Number(end);
    if (!date || !Number.isInteger(s) || !Number.isInteger(e) || e < s) return toast.error("날짜와 범위를 확인해 주세요.");
    const completed = Math.min(item.completed_amount, e - s + 1);
    const { error } = await supabase.from("plan_items").update({ date, unit_start: s, unit_end: e, completed_amount: completed }).eq("id", item.id);
    if (error) return toast.error("저장하지 못했습니다.");
    qc.invalidateQueries({ queryKey: keys.items });
    toast.success("일정을 수정했어요.");
    onClose();
  }

  async function remove() {
    const { error } = await supabase.from("plan_items").delete().eq("id", item.id);
    if (error) return toast.error("삭제하지 못했습니다.");
    qc.invalidateQueries({ queryKey: keys.items });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>일정 수정</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>날짜</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>시작</Label><Input type="number" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>끝</Label><Input type="number" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">범위를 줄였다면 교재 화면의 '남은 분량 재분배'로 빠진 분량을 다시 배분하세요.</p>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={remove}>이 일정 삭제</Button>
            <Button onClick={save}>저장</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
