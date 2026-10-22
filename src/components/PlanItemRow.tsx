import { useState } from "react";
import { Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDate, formatRange, slotAmount, UNIT_LABEL } from "@/lib/planner";
import { useSetCompleted, type PlanItem, type Textbook } from "@/lib/data";
import { toast } from "sonner";

export function PlanItemRow({
  item,
  textbook,
  subject,
  showDate,
  onEdit,
}: {
  item: PlanItem;
  textbook: Textbook;
  subject?: string;
  showDate?: boolean;
  onEdit?: () => void;
}) {
  const setCompleted = useSetCompleted();
  const amount = slotAmount(item);
  const done = item.completed_amount >= amount;
  const partial = item.completed_amount > 0 && !done;
  const [lastDone, setLastDone] = useState("");
  const [open, setOpen] = useState(false);
  const unit = UNIT_LABEL[textbook.unit_type];
  const dayRange = textbook.unit_type === "day" ? dayPages(textbook, item) : null;

  function save(completed: number) {
    setCompleted.mutate(
      { id: item.id, completed },
      { onError: () => toast.error("저장하지 못했습니다. 다시 시도해 주세요.") },
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-3 py-3",
        done && "border-success/40 bg-success/5",
        partial && "border-warning/50",
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => save(done ? 0 : amount)}
        aria-label="완료 체크"
        className="h-5 w-5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {showDate && <span>{formatDate(item.date)}</span>}
          {subject && <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{subject}</span>}
          {textbook.status === "paused" && <span>일시 중지</span>}
        </div>
        <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>{textbook.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatRange(textbook.unit_type, item.unit_start, item.unit_end)}
          {dayRange && <span> · {dayRange}</span>}
          {partial && (
            <span className="ml-2 font-medium text-warning-foreground">
              {item.completed_amount}/{amount}
              {unit} 완료
            </span>
          )}
        </p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">부분</Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <p className="text-sm font-medium">어디까지 했나요?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatRange(textbook.unit_type, item.unit_start, item.unit_end)} 중 마지막으로 끝낸{" "}
            {textbook.unit_type === "day" ? "DAY 번호" : unit === "페이지" ? "페이지" : "문제 번호"}
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(lastDone);
              if (!Number.isFinite(v) || v < item.unit_start - 1 || v > item.unit_end) {
                toast.error(`${item.unit_start - 1}~${item.unit_end} 사이로 입력해 주세요.`);
                return;
              }
              save(v - item.unit_start + 1);
              setOpen(false);
            }}
          >
            <Input
              type="number"
              value={lastDone}
              placeholder={String(item.unit_start - 1 + item.completed_amount)}
              onChange={(e) => setLastDone(e.target.value)}
            />
            <Button type="submit" size="sm">저장</Button>
          </form>
        </PopoverContent>
      </Popover>
      {onEdit && (
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="일정 수정">
          <Pencil />
        </Button>
      )}
    </div>
  );
}

function dayPages(t: Textbook, item: PlanItem) {
  const parts: string[] = [];
  for (let d = item.unit_start; d <= item.unit_end; d++) {
    const r = t.day_ranges?.[String(d)];
    if (r) parts.push(`p.${r}`);
  }
  return parts.length ? parts.join(", ") : null;
}
