"use client";

/**
 * SelfRubric — score one of your own essays on six criteria, 0–2 each. The
 * LSAT essay has no official score; this is a reading checklist that turns
 * "was it good?" into six answerable questions and names the next fix.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { RUBRIC } from "@/lib/writing/guide";

const LEVEL_LABEL = ["Missing", "Partly", "Solid"];

export function SelfRubric() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const done = RUBRIC.every((c) => scores[c.id] != null);
  const total = RUBRIC.reduce((a, c) => a + (scores[c.id] ?? 0), 0);
  const max = RUBRIC.length * 2;
  const weakest = done ? [...RUBRIC].sort((a, b) => scores[a.id] - scores[b.id])[0] : null;
  const verdict = total >= 11 ? "A strong essay. Keep the routine and practise on new prompts." : total >= 8 ? "Competent. One or two fixes would make it strong." : "Not there yet. Fix the lowest row first; it is usually the plan, not the prose.";

  return (
    <div className="space-y-3" data-testid="self-rubric">
      {RUBRIC.map((c) => (
        <fieldset key={c.id} className="rounded-md border border-line p-3">
          <legend className="px-1 text-sm font-semibold">{c.name}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {c.levels.map((desc, lvl) => {
              const on = scores[c.id] === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setScores({ ...scores, [c.id]: lvl })}
                  className={cn("focus-ring rounded-md border p-2.5 text-left text-sm", on ? (lvl === 2 ? "border-ok bg-ok-soft" : lvl === 1 ? "border-warn bg-warn-soft" : "border-bad bg-bad-soft") : "border-line hover:border-line-strong")}
                >
                  <span className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                    {lvl} · {LEVEL_LABEL[lvl]}
                  </span>
                  {desc}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="rounded-md bg-bg-sunken p-4" aria-live="polite">
        {done ? (
          <>
            <p className="text-lg font-semibold tabular-nums">
              {total} of {max}
            </p>
            <p className="text-[15px]">{verdict}</p>
            {weakest && scores[weakest.id] < 2 && (
              <p className="mt-2 text-[15px]">
                <span className="font-semibold">Fix first: {weakest.name}.</span> {weakest.fix}
              </p>
            )}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setScores({})}>
              Clear
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink-2">
            Pick one level in each row ({Object.keys(scores).length} of {RUBRIC.length} done). This is a self-check; the real essay gets no score.
          </p>
        )}
      </div>
    </div>
  );
}

/** Weak sentence first; click to see the stronger version and why it is better. */
export function UpgradeCards({ items }: { items: { move: string; weak: string; strong: string; why: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="upgrade-cards">
      {items.map((u, k) => {
        const on = open.has(k);
        return (
          <button
            key={u.move}
            type="button"
            aria-expanded={on}
            onClick={() => setOpen((o) => (o.has(k) ? new Set([...o].filter((x) => x !== k)) : new Set([...o, k])))}
            className={cn("focus-ring rounded-md border p-4 text-left", on ? "border-ok" : "border-line hover:border-line-strong")}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">{u.move}</span>
            <span className={cn("lsat-text mt-1 block text-[15px]", on && "text-ink-3 line-through decoration-bad")}>{u.weak}</span>
            {on ? (
              <>
                <span className="lsat-text mt-2 block rounded bg-ok-soft p-2 text-[15px]">{u.strong}</span>
                <span className="mt-2 block text-sm text-ink-2">{u.why}</span>
              </>
            ) : (
              <span className="mt-2 block text-sm font-medium text-accent">Show the stronger version →</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
