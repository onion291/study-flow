import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TextbookForm, emptyTextbook, type TextbookValues } from "@/components/TextbookForm";
import { PlanPreview } from "@/components/PlanPreview";
import { persistPlan, usePlanItems, useTextbooks, useWeekdays } from "@/lib/data";
import { computeReplan, suggestEndDate, type TextbookLike } from "@/lib/replan";
import { overloadedDates } from "@/lib/overload";

export const Route = createFileRoute("/_authenticated/textbooks/new")({
  head: () => ({ meta: [{ title: "교재 추가 · StudyFlow" }, { name: "description", content: "새 교재를 등록하고 학습 계획을 자동으로 만듭니다." }, { property: "og:title", content: "교재 추가 · StudyFlow" }, { property: "og:description", content: "새 교재 등록과 자동 계획 생성" }] }),
  component: NewTextbook,
});

function NewTextbook() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: weekdays = [] } = useWeekdays();
  const { data: items = [] } = usePlanItems();
  const { data: textbooks = [] } = useTextbooks();
  const [values, setValues] = useState<TextbookValues | null>(null);
  const [saving, setSaving] = useState(false);

  const plan = useMemo(() => {
    if (!values) return null;
    const t: TextbookLike = { id: "new", ...values, unit_type: values.unit_type };
    const r = computeReplan(t, [], weekdays, values.start_date);
    const suggested = r.result.ok ? null : suggestEndDate(t, [], weekdays, values.start_date);
    const typeOf = (id: string) =>
      id === "new" ? values.unit_type : textbooks.find((x) => x.id === id && x.status === "active")?.unit_type;
    const all = [...items, ...(r.result.ok ? r.result.items.map((s) => ({ ...s, textbook_id: "new" })) : [])];
    return { ...r, suggested, overloads: overloadedDates(all, typeOf) };
  }, [values, weekdays, items, textbooks]);

  async function save() {
    if (!values || !plan?.result.ok) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("textbooks")
        .insert({ ...values, memo: values.memo || null })
        .select("id")
        .single();
      if (error) throw error;
      await persistPlan(data.id, [], [], plan.result.items);
      await qc.invalidateQueries();
      toast.success("교재와 학습 계획을 저장했어요.");
      navigate({ to: "/textbooks/$id", params: { id: data.id } });
    } catch {
      toast.error("저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/textbooks" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> 교재 목록</Link>
      <h1 className="text-2xl font-bold">새 교재 추가</h1>
      <div className="card-soft p-5 sm:p-6">
        <TextbookForm initial={values ?? emptyTextbook()} submitLabel={values ? "다시 계산하기" : "학습 계획 미리보기"} onSubmit={setValues} />
      </div>
      {plan && values && (
        <div className="card-soft space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">자동 생성된 계획</h2>
          <PlanPreview result={plan.result} unitType={values.unit_type} remaining={plan.remaining} overloads={plan.overloads} suggestedEnd={plan.suggested} />
          {plan.result.ok && (
            <Button onClick={save} disabled={saving} variant="accent" size="lg" className="w-full sm:w-auto">
              이 계획으로 저장하기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
