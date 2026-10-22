import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlanItemRow } from "@/components/PlanItemRow";
import { ReplanDialog } from "@/components/ReplanDialog";
import { TextbookForm, type TextbookValues } from "@/components/TextbookForm";
import { usePlanItems, useSubjects, useTextbooks } from "@/lib/data";
import { completedUnits, totalUnits } from "@/lib/replan";
import { daysBetween, formatDate, todayKST, UNIT_LABEL, slotAmount } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/textbooks/$id")({
  head: () => ({ meta: [{ title: "교재 상세 · StudyFlow" }, { name: "description", content: "교재별 학습 일정과 진행률" }, { property: "og:title", content: "교재 상세 · StudyFlow" }, { property: "og:description", content: "교재별 학습 일정과 진행률" }] }),
  component: TextbookDetail,
});

function TextbookDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: textbooks, isLoading } = useTextbooks();
  const { data: allItems = [] } = usePlanItems();
  const { data: subjects = [] } = useSubjects();
  const [editOpen, setEditOpen] = useState(false);
  const t = textbooks?.find((x) => x.id === id);
  const today = todayKST();

  if (isLoading) return <p className="text-muted-foreground">불러오는 중…</p>;
  if (!t) return <p>교재를 찾을 수 없습니다. <Link to="/textbooks" className="text-accent underline">목록으로</Link></p>;

  const items = allItems.filter((i) => i.textbook_id === t.id);
  const done = completedUnits(t, items);
  const total = totalUnits(t);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const unit = UNIT_LABEL[t.unit_type];
  const overdue = items.filter((i) => i.date < today && i.completed_amount < slotAmount(i)).length;

  async function togglePause() {
    const { error } = await supabase.from("textbooks").update({ status: t!.status === "paused" ? "active" : "paused" }).eq("id", t!.id);
    if (error) return toast.error("변경하지 못했습니다.");
    qc.invalidateQueries();
  }

  async function remove() {
    const { error } = await supabase.from("textbooks").delete().eq("id", t!.id);
    if (error) return toast.error("삭제하지 못했습니다.");
    await qc.invalidateQueries();
    toast.success("교재를 삭제했어요.");
    navigate({ to: "/textbooks" });
  }

  async function saveEdit(v: TextbookValues) {
    const { error } = await supabase.from("textbooks").update({ ...v, memo: v.memo || null }).eq("id", t!.id);
    if (error) return toast.error("저장하지 못했습니다.");
    await qc.invalidateQueries();
    setEditOpen(false);
    toast.success("교재 정보를 저장했어요. 분량이나 기간을 바꿨다면 '남은 분량 재분배'로 일정을 다시 만드세요.");
  }

  return (
    <div className="space-y-6">
      <Link to="/textbooks" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> 교재 목록</Link>
      <div className="card-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{subjects.find((s) => s.id === t.subject_id)?.name ?? "과목 없음"}</span>
            {t.status === "paused" && <span className="ml-2 rounded bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground">일시 중지</span>}
            <h1 className="mt-2 text-2xl font-bold">{t.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(t.start_date)} ~ {formatDate(t.end_date)} · {daysBetween(today, t.end_date) >= 0 ? `D-${daysBetween(today, t.end_date)}` : "기간 종료"}
            </p>
            {t.memo && <p className="mt-2 text-sm">{t.memo}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil /> 편집</Button>
            <Button variant="outline" size="sm" onClick={togglePause}>{t.status === "paused" ? <><Play /> 재개</> : <><Pause /> 일시 중지</>}</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 /> 삭제</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>교재를 삭제할까요?</AlertDialogTitle>
                  <AlertDialogDescription>이 교재의 모든 일정과 완료 기록이 함께 삭제됩니다.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>삭제</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span className="font-medium">진행률 {pct}%</span>
            <span className="text-muted-foreground">완료 {done}{unit} · 남은 {total - done}{unit}</span>
          </div>
          <Progress value={pct} className="mt-2 h-3" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ReplanDialog textbook={t} items={items} />
          {overdue > 0 && <span className="text-sm text-destructive">완료하지 못한 지난 일정이 {overdue}일 있어요.</span>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">날짜별 일정</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">저장된 일정이 없습니다. '남은 분량 재분배'로 일정을 만들 수 있어요.</p>}
        {items.map((i) => (
          <PlanItemRow key={i.id} item={i} textbook={t} showDate />
        ))}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>교재 편집</DialogTitle></DialogHeader>
          <TextbookForm
            submitLabel="저장"
            onSubmit={saveEdit}
            initial={{
              name: t.name, subject_id: t.subject_id ?? "", unit_type: t.unit_type, start_unit: t.start_unit, end_unit: t.end_unit,
              initial_completed: t.initial_completed, start_date: t.start_date, end_date: t.end_date, units_per_day: t.units_per_day,
              max_per_day: t.max_per_day, day_ranges: t.day_ranges ?? {}, memo: t.memo ?? "",
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
