import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePlanItems, useSubjects, useTextbooks } from "@/lib/data";
import { completedUnits, totalUnits } from "@/lib/replan";
import { daysBetween, formatDate, todayKST, UNIT_LABEL } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/textbooks/")({
  head: () => ({ meta: [{ title: "내 교재 · StudyFlow" }, { name: "description", content: "등록한 교재와 진행률을 확인합니다." }, { property: "og:title", content: "내 교재 · StudyFlow" }, { property: "og:description", content: "교재별 진행률" }] }),
  component: TextbookList,
});

function TextbookList() {
  const { data: textbooks = [], isLoading } = useTextbooks();
  const { data: items = [] } = usePlanItems();
  const { data: subjects = [] } = useSubjects();
  const today = todayKST();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 교재</h1>
        <Button asChild><Link to="/textbooks/new"><Plus /> 교재 추가</Link></Button>
      </div>
      {!isLoading && textbooks.length === 0 && (
        <div className="card-soft flex flex-col items-center p-10 text-center">
          <BookOpen className="h-10 w-10 text-accent" />
          <p className="mt-3 font-medium">아직 등록된 교재가 없어요</p>
          <p className="mt-1 text-sm text-muted-foreground">교재를 추가하면 공부할 날짜에 맞춰 계획이 자동으로 만들어져요.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {textbooks.map((t) => {
          const mine = items.filter((i) => i.textbook_id === t.id);
          const done = completedUnits(t, mine);
          const total = totalUnits(t);
          const pct = total ? Math.round((done / total) * 100) : 0;
          const dleft = daysBetween(today, t.end_date);
          return (
            <Link key={t.id} to="/textbooks/$id" params={{ id: t.id }} className="card-soft block p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{subjects.find((s) => s.id === t.subject_id)?.name ?? "과목 없음"}</span>
                <span>{t.status === "paused" ? "일시 중지" : dleft >= 0 ? `D-${dleft}` : "기간 종료"}</span>
              </div>
              <h2 className="mt-2 truncate font-semibold">{t.name}</h2>
              <Progress value={pct} className="mt-4 h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{done}/{total}{UNIT_LABEL[t.unit_type]} · {pct}%</span>
                <span>~{formatDate(t.end_date)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
