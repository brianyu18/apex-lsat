"use client";

import { useMemo, useState, useTransition } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toggleDay } from "@/app/onboarding/actions";
import { PHASE_LABELS, type Phase } from "@/lib/planner/generate";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type Day = { day: string; phase: string; minutes: number; completed: boolean; blocks: { label: string; minutes: number; kind: string }[] };

const PHASE_BG: Record<Phase, string> = {
  foundations: "bg-info-soft text-info",
  lr: "bg-accent-soft text-accent",
  rc: "bg-ok-soft text-ok",
  mixed: "bg-warn-soft text-warn",
  protect: "bg-bg-sunken text-ink-2",
};

export function PlanCalendar({ days, today, testDate }: { days: Day[]; today: string; testDate: string | null }) {
  const [month, setMonth] = useState(startOfMonth(parseISO(today)));
  const [selected, setSelected] = useState<string>(today);
  const [pending, start] = useTransition();
  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const lead = first.getDay();
    const list: (Date | null)[] = Array(lead).fill(null);
    for (const d of eachDayOfInterval({ start: first, end: last })) list.push(d);
    while (list.length % 7) list.push(null);
    return list;
  }, [month]);

  const sel = byDay.get(selected);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mx-auto grid max-w-xl grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-3">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mx-auto grid max-w-xl grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = format(d, "yyyy-MM-dd");
          const row = byDay.get(key);
          const isTest = key === testDate;
          const isToday = key === today;
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-label={`${format(d, "MMM d")}${row ? `, ${PHASE_LABELS[row.phase as Phase]}, ${row.minutes} minutes` : ""}`}
              className={cn(
                "focus-ring relative flex h-11 flex-col items-center justify-center rounded-md text-sm sm:h-12",
                row && row.minutes > 0 ? PHASE_BG[row.phase as Phase] : "text-ink-3",
                isTest && "ring-2 ring-accent",
                isSel && "outline outline-2 outline-ink",
              )}
            >
              <span className={cn("tabular-nums", isToday && "font-bold underline")}>{d.getDate()}</span>
              {row?.completed && <Check className="absolute right-0.5 top-0.5 h-3 w-3" />}
              {isTest && <span className="absolute bottom-0.5 text-[9px] font-semibold">TEST</span>}
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="mx-auto mt-4 max-w-xl rounded-md border border-line p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {format(parseISO(sel.day), "EEEE, MMM d")} · {PHASE_LABELS[sel.phase as Phase]}
              </p>
              <p className="text-xs text-ink-3">{sel.minutes ? `${sel.minutes} minutes` : "Rest day"}</p>
            </div>
            {sel.minutes > 0 && (
              <Button
                size="sm"
                variant={sel.completed ? "secondary" : "outline"}
                disabled={pending}
                onClick={() => start(() => toggleDay(sel.day, !sel.completed))}
              >
                {sel.completed ? "Completed" : "Mark done"}
              </Button>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-sm text-ink-2">
            {sel.blocks.map((b, i) => (
              <li key={i} className="flex justify-between">
                <span>{b.label}</span>
                <span className="tabular-nums text-ink-3">{b.minutes ? `${b.minutes}m` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
