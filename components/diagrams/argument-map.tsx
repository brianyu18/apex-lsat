"use client";

/**
 * ArgumentMap — drag (or tap) each sentence of an argument into its role:
 * premise, sub-conclusion, main conclusion, or background/concession. Checks
 * against the key and explains the indicator words.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";

export type Role = "premise" | "sub_conclusion" | "conclusion" | "context";
export interface ArgumentSentence {
  text: string;
  role: Role;
  /** why it has that role — indicator words, what it supports */
  why: string;
}

const ROLE_LABEL: Record<Role, string> = { premise: "Premise", sub_conclusion: "Sub-conclusion", conclusion: "Main conclusion", context: "Context / concession" };
const ROLE_TONE: Record<Role, string> = {
  premise: "border-info bg-info-soft text-info",
  sub_conclusion: "border-warn bg-warn-soft text-warn",
  conclusion: "border-accent bg-accent-soft text-accent",
  context: "border-line-strong bg-bg-sunken text-ink-2",
};

export function ArgumentMap({ sentences, title }: { sentences: ArgumentSentence[]; title?: string }) {
  const [assign, setAssign] = useState<Record<number, Role | null>>(() => Object.fromEntries(sentences.map((_, i) => [i, null])));
  const [checked, setChecked] = useState(false);
  const [active, setActive] = useState<number | null>(0);
  const roles: Role[] = ["context", "premise", "sub_conclusion", "conclusion"];
  const allSet = useMemo(() => sentences.every((_, i) => assign[i]), [assign, sentences]);
  const score = useMemo(() => sentences.filter((s, i) => assign[i] === s.role).length, [assign, sentences]);

  function setRole(i: number, r: Role) {
    setAssign((a) => ({ ...a, [i]: r }));
    setChecked(false);
    const next = sentences.findIndex((_, j) => j > i && !assign[j]);
    setActive(next === -1 ? null : next);
  }

  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title ?? "Map the argument"}</p>
        <span className="text-xs text-ink-3">Tap a sentence, then its role</span>
      </div>

      {/* Structure view: conclusion on top, supported by the rest */}
      <div className="mb-4 rounded-md border border-dashed border-line p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <Slot label="Premises & context" items={sentences.map((s, i) => ({ i, s })).filter(({ i }) => assign[i] === "premise" || assign[i] === "context")} assign={assign} checked={checked} sentences={sentences} />
          <div className="hidden items-center justify-center text-ink-3 sm:flex" aria-hidden>
            →
          </div>
          <div className="space-y-2">
            <Slot label="Sub-conclusion" items={sentences.map((s, i) => ({ i, s })).filter(({ i }) => assign[i] === "sub_conclusion")} assign={assign} checked={checked} sentences={sentences} />
            <Slot label="Main conclusion" items={sentences.map((s, i) => ({ i, s })).filter(({ i }) => assign[i] === "conclusion")} assign={assign} checked={checked} sentences={sentences} emphasis />
          </div>
        </div>
      </div>

      <ol className="space-y-2">
        {sentences.map((s, i) => {
          const r = assign[i];
          const right = checked && r === s.role;
          const wrong = checked && r && r !== s.role;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive(active === i ? null : i)}
                className={cn(
                  "focus-ring w-full rounded-md border px-3 py-2 text-left text-sm",
                  active === i ? "border-ink" : "border-line",
                  right && "border-ok bg-ok-soft",
                  wrong && "border-bad bg-bad-soft",
                )}
                aria-expanded={active === i}
              >
                <span className="lsat-text text-[15px]">{s.text}</span>
                {r && (
                  <span className={cn("ml-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium", ROLE_TONE[r])}>{ROLE_LABEL[r]}</span>
                )}
              </button>
              {active === i && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                  {roles.map((role) => (
                    <button key={role} type="button" onClick={() => setRole(i, role)} className={cn("focus-ring rounded-full border px-2.5 py-1 text-xs font-medium", ROLE_TONE[role], assign[i] === role && "ring-2 ring-ink")}>
                      {ROLE_LABEL[role]}
                    </button>
                  ))}
                </div>
              )}
              {checked && (
                <p className={cn("mt-1 pl-1 text-xs", right ? "text-ok" : "text-bad")}>
                  {right ? "✓ " : `✗ ${ROLE_LABEL[s.role]} — `}
                  {s.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-ink-3">{checked && <Badge tone={score === sentences.length ? "ok" : "warn"}>{score}/{sentences.length} correct</Badge>}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setAssign(Object.fromEntries(sentences.map((_, i) => [i, null]))); setChecked(false); setActive(0); }}>
            Reset
          </Button>
          <Button size="sm" onClick={() => setChecked(true)} disabled={!allSet}>
            Check
          </Button>
        </div>
      </div>
    </div>
  );
}

function Slot({ label, items, assign, checked, sentences, emphasis }: { label: string; items: { i: number; s: ArgumentSentence }[]; assign: Record<number, Role | null>; checked: boolean; sentences: ArgumentSentence[]; emphasis?: boolean }) {
  return (
    <div className={cn("min-h-14 rounded-md border p-2", emphasis ? "border-accent" : "border-line")}>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && <span className="text-xs text-ink-3">—</span>}
        {items.map(({ i }) => (
          <span key={i} className={cn("rounded px-1.5 py-0.5 text-xs", checked && assign[i] === sentences[i].role ? "bg-ok-soft text-ok" : checked ? "bg-bad-soft text-bad" : "bg-bg-sunken text-ink-2")}>
            S{i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
