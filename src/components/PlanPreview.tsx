import { AlertTriangle, CalendarX } from "lucide-react";
import { formatDate, formatRange, slotAmount, UNIT_LABEL, WEEKDAY_LABELS, weekdayOf, type PlanResult, type UnitType } from "@/lib/planner";

export function PlanPreview({
  result,
  unitType,
  remaining,
  overloads,
  suggestedEnd,
}: {
  result: PlanResult;
  unitType: UnitType;
  remaining: number;
  overloads: Map<string, string>;
  suggestedEnd: string | null;
}) {
  const unit = UNIT_LABEL[unitType];
  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 font-semibold text-destructive">
          <CalendarX className="h-5 w-5" />
          {result.reason === "no_days" ? "공부할 수 있는 날짜가 없어요" : "목표 기간 안에 끝낼 수 없어요"}
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {result.reason === "no_days" ? (
            <li>기간 안에 이 과목이 지정된 요일이 없습니다. 요일 설정에서 과목을 추가하거나 기간을 늘려 주세요.</li>
          ) : (
            <>
              <li>
                학습 가능일 {result.availableDays}일, 필요한 학습일 {result.neededDays}일 →{" "}
                <b>{result.neededDays - result.availableDays}일 부족</b>
              </li>
              <li>하루 학습량을 {result.neededPerDay}{unit} 이상으로 늘리거나,</li>
            </>
          )}
          {suggestedEnd && <li>목표 완료일을 <b>{formatDate(suggestedEnd)}</b> 이후로 연장해 보세요.</li>}
          <li>요일 설정에서 이 과목을 공부하는 요일을 추가할 수도 있어요.</li>
        </ul>
      </div>
    );
  }

  if (remaining === 0) return <p className="text-sm text-muted-foreground">남은 분량이 없습니다. 이미 모두 완료했어요.</p>;

  const amts = result.items.map(slotAmount);
  const over = result.items.filter((i) => overloads.has(i.date));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="남은 분량" value={`${remaining}${unit}`} />
        <Stat label="학습일" value={`${result.items.length}일`} />
        <Stat label="하루 분량" value={Math.min(...amts) === Math.max(...amts) ? `${amts[0]}${unit}` : `${Math.min(...amts)}~${Math.max(...amts)}${unit}`} />
      </div>
      {over.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            다른 교재와 합쳐 학습량이 많은 날이 {over.length}일 있어요:{" "}
            {over.slice(0, 3).map((i) => `${formatDate(i.date)}(${overloads.get(i.date)})`).join(", ")}
            {over.length > 3 && " 외"}. 저장 후 달력에서 날짜를 옮길 수 있어요.
          </div>
        </div>
      )}
      <div className="max-h-80 divide-y overflow-y-auto rounded-xl border bg-card">
        {result.items.map((i) => (
          <div key={i.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className={overloads.has(i.date) ? "font-medium text-warning-foreground" : ""}>
              {formatDate(i.date)} ({WEEKDAY_LABELS[weekdayOf(i.date)]})
            </span>
            <span className="font-medium">{formatRange(unitType, i.unit_start, i.unit_end)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-primary">{value}</p>
    </div>
  );
}
