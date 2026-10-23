import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, CalendarDays, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlanItemRow } from "@/components/PlanItemRow";
import { usePlanItems, useSubjects, useTextbooks } from "@/lib/data";
import { completedUnits, totalUnits } from "@/lib/replan";
import { daysBetween, formatDate, slotAmount, todayKST, WEEKDAY_LABELS, weekdayOf } from "@/lib/planner";
import { overloadedDates } from "@/lib/overload";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "대시보드 · StudyFlow" }, { name: "description", content: "오늘의 학습과 전체 진행률" }, { property: "og:title", content: "대시보드 · StudyFlow" }, { property: "og:description", content: "오늘의 학습과 전체 진행률" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: textbooks = [], isLoading } = useTextbooks();
  const { data: items = [] } = usePlanItems();
  const { data: subjects = [] } = useSubjects();
  const today = todayKST();
  const active = textbooks.filter((t) => t.status === "active");
  const byId = new Map(textbooks.map((t) => [t.id, t]));
  const activeItems = items.filter((i) => byId.get(i.textbook_id)?.status === "active");
  const todays = activeItems.filter((i) => i.date === today);
  const todayDone = todays.filter((i) => i.completed_amount >= slotAmount(i)).length;
  const subjName = (id: string | null) => subjects.find((s) => s.id === id)?.name;

  let done = 0, total = 0;
  for (const t of active) {
    done += completedUnits(t, items.filter((i) => i.textbook_id === t.id));
    total += totalUnits(t);
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  const overdue = activeItems.filter((i) => i.date < today && i.completed_amount < slotAmount(i));
  const overdueBooks = [...new Set(overdue.map((i) => i.textbook_id))];
  const upcoming = [...active].filter((t) => t.end_date >= today).sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 4);
  const todayOverload = overloadedDates(activeItems, (id) => byId.get(id)?.unit_type).get(today);

  return (
    <div className="space-y-6">
      <section className="bg-hero rounded-3xl p-6 text-primary-foreground sm:p-8">
        <p className="text-sm opacity-80">{formatDate(today)} ({WEEKDAY_LABELS[weekdayOf(today)]})</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {todays.length ? `오늘 공부할 항목 ${todays.length}개 중 ${todayDone}개 완료` : "오늘은 예정된 학습이 없어요"}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link to="/textbooks/new"><Plus /> 새 교재 추가</Link></Button>
          <Button asChild variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/calendar"><CalendarDays /> 전체 일정 보기</Link></Button>
        </div>
      </section>

      {!isLoading && textbooks.length === 0 ? (
        <div className="card-soft flex flex-col items-center p-10 text-center">
          <BookOpen className="h-10 w-10 text-accent" />
          <p className="mt-3 font-medium">첫 교재를 추가해 보세요</p>
          <p className="mt-1 text-sm text-muted-foreground">먼저 요일 설정에서 과목을 정한 뒤, 교재를 등록하면 계획이 자동으로 만들어져요.</p>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline"><Link to="/weekly">요일 설정</Link></Button>
            <Button asChild><Link to="/textbooks/new">교재 추가</Link></Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <h2 className="font-semibold">오늘의 학습</h2>
            {todayOverload && (
              <p className="flex items-center gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning-foreground"><AlertTriangle className="h-4 w-4" /> 오늘 학습량이 많아요 ({todayOverload}).</p>
            )}
            {todays.length === 0 && <p className="card-soft p-5 text-sm text-muted-foreground">오늘 배정된 학습이 없습니다.</p>}
            {todays.map((i) => {
              const t = byId.get(i.textbook_id)!;
              return <PlanItemRow key={i.id} item={i} textbook={t} subject={subjName(t.subject_id)} />;
            })}
            {overdueBooks.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">완료하지 못한 지난 일정이 {overdue.length}개 있어요</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overdueBooks.map((id) => (
                    <Link key={id} to="/textbooks/$id" params={{ id }} className="rounded-full border bg-card px-3 py-1 hover:bg-secondary">
                      {byId.get(id)?.name} 재분배하기 →
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
          <aside className="space-y-4">
            <div className="card-soft p-5">
              <h2 className="font-semibold">전체 진행률</h2>
              <p className="mt-2 text-3xl font-bold text-primary">{pct}%</p>
              <Progress value={pct} className="mt-3 h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">진행 중인 교재 {active.length}권 기준</p>
            </div>
            <div className="card-soft p-5">
              <h2 className="font-semibold">마감이 가까운 교재</h2>
              <div className="mt-3 space-y-3">
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground">진행 중인 교재가 없습니다.</p>}
                {upcoming.map((t) => {
                  const tp = Math.round((completedUnits(t, items.filter((i) => i.textbook_id === t.id)) / Math.max(1, totalUnits(t))) * 100);
                  return (
                    <Link key={t.id} to="/textbooks/$id" params={{ id: t.id }} className="block">
                      <div className="flex justify-between text-sm">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="shrink-0 text-accent">D-{daysBetween(today, t.end_date)}</span>
                      </div>
                      <Progress value={tp} className="mt-1.5 h-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">{tp}% · ~{formatDate(t.end_date)}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
