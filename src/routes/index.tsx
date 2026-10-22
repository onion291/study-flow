import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyFlow 스터디플로우 — 교재 분량 자동 학습 플래너" },
      { name: "description", content: "교재 분량과 목표일, 요일별 과목을 입력하면 공부할 날짜에 맞춰 학습량을 자동으로 나눠 드려요." },
      { property: "og:title", content: "StudyFlow 스터디플로우" },
      { property: "og:description", content: "교재 분량을 공부 가능한 날짜에 자동 분배하는 학습 플래너" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const features = [
    { icon: BookOpen, title: "교재 분량 자동 분배", desc: "페이지·문제·DAY 단위 분량을 공부하는 요일에만 정확히 나눠요." },
    { icon: CalendarCheck, title: "오늘 할 공부 한눈에", desc: "오늘의 범위와 진행률을 대시보드와 달력에서 확인해요." },
    { icon: RefreshCw, title: "밀린 분량 재분배", desc: "못 한 분량은 남은 학습일에 다시 나눠 계획을 지켜요." },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-lg font-bold text-primary">StudyFlow</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">로그인</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="bg-hero mt-4 rounded-3xl px-6 py-14 text-primary-foreground sm:px-12 sm:py-20">
          <p className="text-sm font-medium opacity-80">스터디플로우</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            교재만 입력하면,
            <br />
            매일 공부할 범위가 정해져요
          </h1>
          <p className="mt-5 max-w-xl text-base opacity-85">
            분량, 목표 완료일, 요일별 과목을 바탕으로 실제로 공부할 수 있는 날짜에만 학습량을 나눠 드립니다.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-8">
            <Link to="/auth">무료로 시작하기</Link>
          </Button>
        </section>
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card-soft p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <h2 className="mt-4 font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
