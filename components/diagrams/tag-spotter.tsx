"use client";

/**
 * TagSpotter — recognition drill for a logic tag. Shows short stimuli one at a
 * time; the student says whether the pattern is present. Instant feedback with
 * the tell-tale words highlighted.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export interface SpotItem {
  text: string;
  present: boolean;
  /** the words that reveal (or would reveal) the pattern */
  tell: string;
  why: string;
}

export function TagSpotter({ tag, items, title }: { tag: string; items: SpotItem[]; title?: string }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [score, setScore] = useState({ right: 0, n: 0 });
  const it = items[i];
  const done = i >= items.length;

  function pick(v: boolean) {
    if (picked != null) return;
    setPicked(v);
    setScore((s) => ({ right: s.right + (v === it.present ? 1 : 0), n: s.n + 1 }));
  }
  function next() {
    setPicked(null);
    setI((x) => x + 1);
  }
  function reset() {
    setI(0);
    setPicked(null);
    setScore({ right: 0, n: 0 });
  }

  const highlighted = picked != null && it ? highlight(it.text, it.tell) : null;

  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title ?? `Spot it: ${tag}`}</p>
        <Badge tone="neutral">
          {Math.min(i + 1, items.length)} / {items.length}
        </Badge>
      </div>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm">
            You spotted {score.right} of {score.n}. {score.right === score.n ? "Clean." : "Reread the tells on the ones you missed and run it again."}
          </p>
          <Button size="sm" variant="outline" onClick={reset}>
            Run again
          </Button>
        </div>
      ) : (
        <>
          <p className="lsat-text text-[15px]">{highlighted ?? it.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={picked === true ? (it.present ? "primary" : "danger") : "outline"} onClick={() => pick(true)} disabled={picked != null}>
              Pattern present
            </Button>
            <Button size="sm" variant={picked === false ? (!it.present ? "primary" : "danger") : "outline"} onClick={() => pick(false)} disabled={picked != null}>
              Not here
            </Button>
            {picked != null && (
              <Button size="sm" variant="ghost" onClick={next}>
                Next →
              </Button>
            )}
          </div>
          {picked != null && (
            <p className={cn("mt-3 rounded-md px-3 py-2 text-sm", picked === it.present ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
              {picked === it.present ? "Right. " : "Not quite. "}
              {it.why}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function highlight(text: string, tell: string) {
  if (!tell) return text;
  const idx = text.toLowerCase().indexOf(tell.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-warn-soft px-0.5 text-warn">{text.slice(idx, idx + tell.length)}</mark>
      {text.slice(idx + tell.length)}
    </>
  );
}
