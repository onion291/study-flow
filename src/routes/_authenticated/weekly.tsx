import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, Pencil, Coffee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { keys, useSubjects, useWeekdays } from "@/lib/data";
import { WEEKDAY_LABELS, type WeekdaySetting } from "@/lib/planner";

export const Route = createFileRoute("/_authenticated/weekly")({
  head: () => ({ meta: [{ title: "요일별 과목 설정 · StudyFlow" }, { name: "description", content: "요일마다 공부할 과목을 설정합니다." }, { property: "og:title", content: "요일별 과목 설정 · StudyFlow" }, { property: "og:description", content: "요일마다 공부할 과목 설정" }] }),
  component: WeeklyPage,
});

const ORDER = [1, 2, 3, 4, 5, 6, 0];

function WeeklyPage() {
  const qc = useQueryClient();
  const { data: subjects = [] } = useSubjects();
  const { data: weekdays = [] } = useWeekdays();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (subjects.some((s) => s.name === name)) return toast.error("이미 있는 과목입니다.");
    const { error } = await supabase.from("subjects").insert({ name });
    if (error) return toast.error("과목을 추가하지 못했습니다.");
    setNewName("");
    qc.invalidateQueries({ queryKey: keys.subjects });
  }

  async function renameSubject() {
    if (!editing || !editing.name.trim()) return;
    const { error } = await supabase.from("subjects").update({ name: editing.name.trim() }).eq("id", editing.id);
    if (error) return toast.error("수정하지 못했습니다.");
    setEditing(null);
    qc.invalidateQueries({ queryKey: keys.subjects });
  }

  async function deleteSubject(id: string, name: string) {
    if (!confirm(`'${name}' 과목을 삭제할까요? 이 과목의 교재는 과목 없음으로 바뀌고 새 계획에 배분되지 않습니다.`)) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error("삭제하지 못했습니다.");
    await Promise.all(
      weekdays
        .filter((w) => w.subject_ids.includes(id))
        .map((w) => saveDay({ ...w, subject_ids: w.subject_ids.filter((s) => s !== id) }, false)),
    );
    qc.invalidateQueries();
  }

  async function saveDay(w: WeekdaySetting, refresh = true) {
    qc.setQueryData<WeekdaySetting[]>(keys.weekdays, (old) => old?.map((o) => (o.weekday === w.weekday ? w : o)));
    const { error } = await supabase
      .from("weekday_settings")
      .upsert({ weekday: w.weekday, is_rest: w.is_rest, subject_ids: w.subject_ids }, { onConflict: "user_id,weekday" });
    if (error) toast.error("저장하지 못했습니다.");
    if (refresh || error) qc.invalidateQueries({ queryKey: keys.weekdays });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">요일별 과목 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">여기서 정한 요일에만 해당 과목의 학습량이 배분돼요. 변경 사항은 바로 저장됩니다.</p>
      </div>

      <section className="card-soft p-5">
        <h2 className="font-semibold">내 과목</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {subjects.map((s) =>
            editing?.id === s.id ? (
              <div key={s.id} className="flex items-center gap-1">
                <Input className="h-8 w-28" value={editing.name} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && renameSubject()} />
                <Button size="icon" variant="ghost" onClick={renameSubject} aria-label="저장"><Check /></Button>
              </div>
            ) : (
              <span key={s.id} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm text-secondary-foreground">
                {s.name}
                <button className="rounded-full p-1 hover:bg-card" onClick={() => setEditing({ id: s.id, name: s.name })} aria-label="이름 수정"><Pencil className="h-3 w-3" /></button>
                <button className="rounded-full p-1 hover:bg-card" onClick={() => deleteSubject(s.id, s.name)} aria-label="삭제"><Trash2 className="h-3 w-3" /></button>
              </span>
            ),
          )}
          {subjects.length === 0 && <p className="text-sm text-muted-foreground">예: 수학, 영어, 과학, 국어</p>}
        </div>
        <form onSubmit={addSubject} className="mt-4 flex max-w-sm gap-2">
          <Input placeholder="과목 이름" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button type="submit"><Plus /> 추가</Button>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((wd) => {
          const w = weekdays.find((x) => x.weekday === wd);
          if (!w) return null;
          return (
            <div key={wd} className={cn("card-soft p-4", w.is_rest && "opacity-70")}>
              <div className="flex items-center justify-between">
                <h3 className={cn("font-semibold", wd === 0 && "text-destructive", wd === 6 && "text-accent")}>{WEEKDAY_LABELS[wd]}요일</h3>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  공부하는 날
                  <Switch checked={!w.is_rest} onCheckedChange={(c) => saveDay({ ...w, is_rest: !c })} />
                </label>
              </div>
              {w.is_rest ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Coffee className="h-4 w-4" /> 쉬는 날</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subjects.map((s) => {
                    const on = w.subject_ids.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => saveDay({ ...w, subject_ids: on ? w.subject_ids.filter((x) => x !== s.id) : [...w.subject_ids, s.id] })}
                        className={cn("rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                  {subjects.length === 0 && <p className="text-sm text-muted-foreground">먼저 과목을 추가해 주세요.</p>}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
