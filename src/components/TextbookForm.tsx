import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSubjects } from "@/lib/data";
import { todayKST, addDays, type UnitType } from "@/lib/planner";

export interface TextbookValues {
  name: string;
  subject_id: string;
  unit_type: UnitType;
  start_unit: number;
  end_unit: number;
  initial_completed: number;
  start_date: string;
  end_date: string;
  units_per_day: number;
  max_per_day: number | null;
  day_ranges: Record<string, string>;
  memo: string;
}

export function emptyTextbook(): TextbookValues {
  const t = todayKST();
  return {
    name: "",
    subject_id: "",
    unit_type: "page",
    start_unit: 1,
    end_unit: 100,
    initial_completed: 0,
    start_date: t,
    end_date: addDays(t, 30),
    units_per_day: 1,
    max_per_day: null,
    day_ranges: {},
    memo: "",
  };
}

export function validateTextbook(v: TextbookValues): string | null {
  if (!v.name.trim()) return "교재 이름을 입력해 주세요.";
  if (!v.subject_id) return "과목을 선택해 주세요.";
  if (!Number.isInteger(v.start_unit) || !Number.isInteger(v.end_unit) || v.end_unit < v.start_unit)
    return "분량 범위를 확인해 주세요. 마지막 값이 시작 값보다 커야 합니다.";
  const total = v.end_unit - v.start_unit + 1;
  if (v.initial_completed < 0 || v.initial_completed > total) return `완료한 분량은 0~${total} 사이여야 합니다.`;
  if (!v.start_date || !v.end_date) return "시작일과 목표 완료일을 입력해 주세요.";
  if (v.end_date < v.start_date) return "목표 완료일은 시작일 이후여야 합니다.";
  if (v.unit_type === "day" && v.units_per_day < 1) return "하루 DAY 수는 1 이상이어야 합니다.";
  return null;
}

export function TextbookForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial: TextbookValues;
  submitLabel: string;
  onSubmit: (v: TextbookValues) => void;
  busy?: boolean;
}) {
  const { data: subjects = [] } = useSubjects();
  const [v, setV] = useState<TextbookValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TextbookValues>(k: K, val: TextbookValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) => (s === "" ? 0 : Math.floor(Number(s)));
  const total = Math.max(0, v.end_unit - v.start_unit + 1);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const err = validateTextbook(v);
        setError(err);
        if (!err) onSubmit(v);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>교재 이름</Label>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 쎈 수학 1-1" />
        </div>
        <div className="space-y-1.5">
          <Label>과목</Label>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 과목이 없어요.{" "}
              <Link to="/weekly" className="font-medium text-accent underline">요일 설정</Link>에서 과목을 먼저 추가해 주세요.
            </p>
          ) : (
            <Select value={v.subject_id} onValueChange={(x) => set("subject_id", x)}>
              <SelectTrigger><SelectValue placeholder="과목 선택" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>학습량 유형</Label>
        <RadioGroup
          value={v.unit_type}
          onValueChange={(x) => {
            const t = x as UnitType;
            setV((p) => ({ ...p, unit_type: t, start_unit: 1 }));
          }}
          className="grid grid-cols-3 gap-2"
        >
          {([["page", "페이지"], ["problem", "문제 수"], ["day", "DAY 단위"]] as const).map(([val, label]) => (
            <Label key={val} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 has-[:checked]:border-accent has-[:checked]:bg-secondary">
              <RadioGroupItem value={val} /> {label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {v.unit_type === "page" ? (
          <>
            <div className="space-y-1.5">
              <Label>시작 페이지</Label>
              <Input type="number" min={0} value={v.start_unit} onChange={(e) => set("start_unit", num(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>마지막 페이지</Label>
              <Input type="number" min={1} value={v.end_unit} onChange={(e) => set("end_unit", num(e.target.value))} />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label>{v.unit_type === "day" ? "전체 DAY 수" : "전체 문제 수"}</Label>
            <Input type="number" min={1} value={v.end_unit} onChange={(e) => set("end_unit", num(e.target.value))} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>이미 완료한 분량</Label>
          <Input type="number" min={0} value={v.initial_completed} onChange={(e) => set("initial_completed", num(e.target.value))} />
          <p className="text-xs text-muted-foreground">전체 {total} 중 앞에서부터</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>시작일</Label>
          <Input type="date" value={v.start_date} onChange={(e) => set("start_date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>목표 완료일</Label>
          <Input type="date" value={v.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </div>
        {v.unit_type === "day" ? (
          <div className="space-y-1.5">
            <Label>하루에 공부할 DAY 수</Label>
            <Input type="number" min={1} value={v.units_per_day} onChange={(e) => set("units_per_day", Math.max(1, num(e.target.value)))} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>하루 최대 분량 (선택)</Label>
            <Input
              type="number"
              min={1}
              value={v.max_per_day ?? ""}
              placeholder="제한 없음"
              onChange={(e) => set("max_per_day", e.target.value === "" ? null : Math.max(1, num(e.target.value)))}
            />
          </div>
        )}
      </div>

      {v.unit_type === "day" && v.end_unit > 0 && v.end_unit <= 200 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm">DAY별 페이지 범위 연결 (선택)</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: v.end_unit }, (_, i) => i + 1).map((d) => (
              <div key={d} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">DAY {d}</span>
                <Input
                  className="h-8"
                  placeholder="예: 12-18"
                  value={v.day_ranges[String(d)] ?? ""}
                  onChange={(e) => set("day_ranges", { ...v.day_ranges, [String(d)]: e.target.value })}
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="space-y-1.5">
        <Label>메모 (선택)</Label>
        <Textarea value={v.memo} onChange={(e) => set("memo", e.target.value)} rows={2} />
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{submitLabel}</Button>
    </form>
  );
}
