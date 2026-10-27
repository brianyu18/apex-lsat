"use client";

/**
 * TrapCatalog — the wrong-answer patterns for a question type, each with a
 * mini example you can toggle: see the stimulus, the tempting wrong answer,
 * and the exact words that kill it.
 */
import { useState } from "react";
import { TRAP_LABELS, type TrapPattern } from "@/lib/content/taxonomy";
import { cn } from "@/lib/ui/cn";

export interface TrapExample {
  pattern: TrapPattern;
  /** short stimulus or paraphrase */
  setup: string;
  /** the tempting wrong answer */
  tempting: string;
  /** the words that kill it */
  killer: string;
  /** what the right answer does instead */
  instead: string;
}

export function TrapCatalog({ title, traps }: { title?: string; traps: TrapExample[] }) {
  const [open, setOpen] = useState<number>(0);
  const t = traps[open];
  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold">{title ?? "The wrong answers you'll see"}</p>
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <div className="flex flex-wrap gap-1.5 md:flex-col">
          {traps.map((tr, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} aria-pressed={open === i} className={cn("focus-ring rounded-md border px-3 py-2 text-left text-sm", open === i ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-line-strong")}>
              {TRAP_LABELS[tr.pattern]}
            </button>
          ))}
        </div>
        {t && (
          <div className="space-y-3">
            <div className="rounded-md bg-bg-sunken p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Setup</p>
              <p className="lsat-text mt-1 text-[15px]">{t.setup}</p>
            </div>
            <div className="rounded-md border border-bad bg-bad-soft/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-bad">Tempting wrong answer</p>
              <p className="lsat-text mt-1 text-[15px]">{t.tempting}</p>
              <p className="mt-2 text-sm text-bad">
                <span className="font-semibold">Killed by: </span>
                {t.killer}
              </p>
            </div>
            <div className="rounded-md border border-ok bg-ok-soft/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ok">What the right answer does instead</p>
              <p className="mt-1 text-sm text-ink">{t.instead}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
