"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Check, RotateCcw } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { markReviewed } from "@/app/review/actions";
import { typeLabel } from "@/lib/content/labels";

export type InboxItem = {
  attemptId: string;
  questionId: string;
  errorType: string | null;
  srsBox: number;
  nextDue: string | null;
  createdAt: string;
  type: string;
  difficulty: number;
  stem: string | null;
  source?: "original" | "official_ref";
  pt?: number | null;
  sectionNumber?: number | null;
  number?: number | null;
  gist?: string | null;
  stimulus: string | null;
  answer: string | null;
  correct: boolean | null;
  seconds: number | null;
  confidence: string | null;
  guessFlag: boolean;
  takeaway: string | null;
};

const ERROR_LABEL: Record<string, string> = {
  misread: "Misread",
  logic_gap: "Logic gap",
  trap: "Fell for a trap",
  time_pressure: "Time pressure",
  careless: "Careless",
  guessed_right: "Guessed right",
};

export function InboxList({ items, reviewed = false }: { items: InboxItem[]; reviewed?: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const [pending, start] = useTransition();
  const types = Array.from(new Set(items.map((i) => i.type)));
  const shown = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-3">
      {!reviewed && types.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All · {items.length}
          </FilterChip>
          {types.map((t) => (
            <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {typeLabel(t)} · {items.filter((i) => i.type === t).length}
            </FilterChip>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {shown.map((i) => (
          <li key={i.attemptId}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <Badge>{i.source === "official_ref" ? "Official" : typeLabel(i.type)}</Badge>
                  {i.source !== "official_ref" && <Badge tone="neutral">L{i.difficulty}</Badge>}
                  {i.guessFlag && i.correct ? <Badge tone="warn">Guessed right</Badge> : <Badge tone="bad">Missed</Badge>}
                  {i.errorType && <Badge tone="info">{ERROR_LABEL[i.errorType] ?? i.errorType}</Badge>}
                  <span className="text-ink-3">{formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}</span>
                  {!reviewed && i.nextDue && <span className="text-ink-3">· re-drill {i.nextDue}</span>}
                </div>
                {i.source === "official_ref" ? (
                  <>
                    <p className="text-sm font-medium">
                      Official · PT {i.pt} · S{i.sectionNumber} · #{i.number}
                    </p>
                    <p className="lsat-text line-clamp-2 text-sm text-ink-2">{i.gist ?? "No gist yet — open to write one."}</p>
                  </>
                ) : (
                  <>
                    <p className="lsat-text line-clamp-2 text-sm text-ink-2">{i.stimulus}</p>
                    <p className="mt-1 text-sm font-medium">{i.stem}</p>
                  </>
                )}
                {i.takeaway && <p className="mt-1 text-sm text-accent">Takeaway: {i.takeaway}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/review/${i.attemptId}`}>{reviewed ? "Open" : "Review"}</Link>
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => markReviewed(i.attemptId, !reviewed))} aria-label={reviewed ? "Restore to inbox" : "Mark reviewed"}>
                  {reviewed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`focus-ring rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2"}`}>
      {children}
    </button>
  );
}
