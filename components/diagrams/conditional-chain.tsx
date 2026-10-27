"use client";

/**
 * ConditionalChain — type conditional statements in plain "A -> B" form, see
 * them chained, with the contrapositive generated live, and test inferences.
 * Also supports a fixed example with a built-in "what follows?" quiz.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";

type Lit = { name: string; neg: boolean };
type Rule = { from: Lit; to: Lit; raw: string };

function parseLit(s: string): Lit | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(not\s+|¬|~|!|-)?\s*(.+)$/i);
  if (!m) return null;
  return { name: m[2].trim().replace(/\s+/g, " "), neg: !!m[1] };
}
function parseRule(line: string): Rule | null {
  const m = line.split(/->|→|=>|⇒/);
  if (m.length !== 2) return null;
  const from = parseLit(m[0]);
  const to = parseLit(m[1]);
  if (!from || !to) return null;
  return { from, to, raw: line.trim() };
}
const show = (l: Lit) => (l.neg ? `¬${l.name}` : l.name);
const neg = (l: Lit): Lit => ({ name: l.name, neg: !l.neg });
const same = (a: Lit, b: Lit) => a.name.toLowerCase() === b.name.toLowerCase() && a.neg === b.neg;

/** All literals derivable from `start` by following rules and contrapositives. */
function closure(start: Lit, rules: Rule[]): Lit[] {
  const all: Rule[] = [...rules, ...rules.map((r) => ({ from: neg(r.to), to: neg(r.from), raw: r.raw }))];
  const out: Lit[] = [start];
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of all) {
      if (out.some((l) => same(l, r.from)) && !out.some((l) => same(l, r.to))) {
        out.push(r.to);
        changed = true;
      }
    }
  }
  return out.slice(1);
}

export function ConditionalChain({
  initial = ["study hard -> pass", "pass -> graduate"],
  title,
  quiz,
}: {
  initial?: string[];
  title?: string;
  /** optional checks: given this literal, which statement is valid? */
  quiz?: { given: string; options: { text: string; valid: boolean; why: string }[] }[];
}) {
  const [text, setText] = useState(initial.join("\n"));
  const [given, setGiven] = useState("");
  const [picked, setPicked] = useState<Record<number, number | null>>({});
  const rules = useMemo(() => text.split("\n").map(parseRule).filter((r): r is Rule => !!r), [text]);
  const givenLit = parseLit(given);
  const derived = givenLit ? closure(givenLit, rules) : [];

  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold">{title ?? "Conditional chains & the contrapositive"}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="cc-rules">
            Rules — one per line, <code>A -&gt; B</code>; use <code>not</code> for negation
          </label>
          <textarea id="cc-rules" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="focus-ring w-full rounded-md border border-line bg-bg-elev p-2 font-mono text-sm" />
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="cc-given">
              Suppose this is true:
            </label>
            <input id="cc-given" value={given} onChange={(e) => setGiven(e.target.value)} placeholder="e.g. not graduate" className="focus-ring h-9 w-full rounded-md border border-line bg-bg-elev px-2 font-mono text-sm" />
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">Rules & contrapositives</p>
            <ul className="space-y-1">
              {rules.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-md bg-bg-sunken px-2 py-1.5 font-mono text-xs">
                  <span className="text-ink">{show(r.from)} → {show(r.to)}</span>
                  <span className="text-ink-3">≡</span>
                  <span className="text-accent">{show(neg(r.to))} → {show(neg(r.from))}</span>
                </li>
              ))}
              {rules.length === 0 && <li className="text-xs text-ink-3">Add a rule like <code>rain -&gt; wet</code>.</li>}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">What must follow</p>
            {givenLit ? (
              derived.length ? (
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
                  <Badge tone="info">{show(givenLit)}</Badge>
                  {derived.map((d, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="text-ink-3">→</span>
                      <Badge tone="ok">{show(d)}</Badge>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-2">
                  Nothing follows from <code>{show(givenLit)}</code>. A sufficient condition being false (or a necessary one being true) triggers no rule.
                </p>
              )
            ) : (
              <p className="text-xs text-ink-3">Type a starting fact to see the chain fire.</p>
            )}
          </div>
        </div>
      </div>

      {quiz && (
        <div className="mt-5 space-y-4 border-t border-line pt-4">
          {quiz.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm">
                Given <code className="rounded bg-bg-sunken px-1">{q.given}</code>, which must be true?
              </p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {q.options.map((o, oi) => {
                  const p = picked[qi];
                  const chosen = p === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setPicked((s) => ({ ...s, [qi]: oi }))}
                      className={cn("focus-ring rounded-md border px-3 py-2 text-left text-sm", chosen ? (o.valid ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft") : "border-line")}
                    >
                      <span className="font-mono">{o.text}</span>
                      {chosen && <span className="mt-1 block text-xs text-ink-2">{o.why}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setPicked({})}>
            Reset quiz
          </Button>
        </div>
      )}
    </div>
  );
}
