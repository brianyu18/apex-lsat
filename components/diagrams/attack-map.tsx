"use client";

/**
 * AttackMap — the per-type method as a clickable path: read → find → prephrase → judge.
 * Each step expands to show what to do on *this* type, with a worked mini-example that
 * updates as you click through. One component, parameterized per question type.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";

export interface AttackStep {
  label: string; // ≤ 4 words
  do: string; // what to do at this step for this type
  example: string; // the worked example's state at this step
}

export function AttackMap({ title, type, steps, stem }: { title?: string; type: string; stem: string; steps: AttackStep[] }) {
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title ?? `How to attack: ${type}`}</p>
        <Badge tone="neutral">Stem: &ldquo;{stem}&rdquo;</Badge>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5" aria-label="Steps">
        {steps.map((st, k) => (
          <li key={k} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setI(k)}
              aria-current={i === k ? "step" : undefined}
              className={cn(
                "focus-ring rounded-full border px-3 py-1 text-xs font-medium",
                i === k ? "border-accent bg-accent text-accent-ink" : k < i ? "border-ok bg-ok-soft text-ok" : "border-line text-ink-2 hover:border-line-strong",
              )}
            >
              {k + 1}. {st.label}
            </button>
            {k < steps.length - 1 && <span className="text-ink-3" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-line p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Do</p>
          <p className="mt-1 text-sm">{s.do}</p>
        </div>
        <div className="rounded-md bg-bg-sunken p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Worked example</p>
          <p className="lsat-text mt-1 text-[15px] whitespace-pre-line">{s.example}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-between">
        <button type="button" className="focus-ring text-sm text-ink-2 hover:text-ink disabled:opacity-40" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          ← Back
        </button>
        <button type="button" className="focus-ring text-sm font-medium text-accent hover:underline disabled:opacity-40" onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))} disabled={i === steps.length - 1}>
          Next step →
        </button>
      </div>
    </div>
  );
}
