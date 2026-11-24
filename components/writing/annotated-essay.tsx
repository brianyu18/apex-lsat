"use client";

/**
 * AnnotatedEssay — a model essay you read paragraph by paragraph. Selecting a
 * paragraph highlights the phrases worth noticing and lists what each one is
 * doing. Used in the Argumentative Writing guide.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { highlightRuns, type ModelEssay } from "@/lib/writing/guide";

export function AnnotatedEssay({ essay, words }: { essay: ModelEssay; words: number }) {
  const [sel, setSel] = useState(0);
  const [all, setAll] = useState(false);
  const weak = essay.quality === "weak";
  const ok = essay.quality === "ok";
  const p = essay.paragraphs[sel];
  const markClass = weak ? "bg-bad-soft ring-bad" : "bg-warn-soft ring-warn";

  return (
    <div className="space-y-4" data-testid={`essay-${essay.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={weak ? "bad" : ok ? "warn" : "ok"}>{weak ? "Weak" : ok ? "Competent" : "Strong"}</Badge>
        <Badge tone="neutral">{words} words</Badge>
        <Badge tone="neutral">{essay.paragraphs.length} paragraphs</Badge>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAll(!all)} aria-pressed={all}>
          {all ? "Show one paragraph's notes" : "Show all highlights"}
        </Button>
      </div>
      <p className="text-sm text-ink-2">{essay.approach}</p>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0 space-y-2">
          {essay.paragraphs.map((para, k) => {
            const on = all || k === sel;
            const runs = on ? highlightRuns(para.text, para.notes.map((n) => n.quote).filter((q): q is string => Boolean(q))) : [{ text: para.text, mark: false }];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSel(k)}
                aria-pressed={k === sel}
                aria-label={`Paragraph ${k + 1}: ${para.role}`}
                className={cn("focus-ring block w-full rounded-md border p-3 text-left", k === sel ? (weak ? "border-bad" : ok ? "border-warn" : "border-accent") : "border-transparent hover:border-line")}
              >
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  ¶{k + 1} · {para.role}
                </span>
                <span className="lsat-text block text-[15px] leading-relaxed">
                  {runs.map((r, j) =>
                    r.mark ? (
                      <mark key={j} className={cn("rounded px-0.5 text-ink ring-1", markClass)}>
                        {r.text}
                      </mark>
                    ) : (
                      <span key={j}>{r.text}</span>
                    ),
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start" aria-live="polite">
          <div className={cn("rounded-md border p-4", weak ? "border-bad bg-bad-soft" : ok ? "border-warn bg-warn-soft" : "border-accent bg-accent-soft")}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Paragraph {sel + 1} of {essay.paragraphs.length}
            </p>
            <p className="mt-0.5 font-semibold">{p.role}</p>
          </div>
          <ol className="space-y-2">
            {p.notes.map((n, k) => (
              <li key={k} className="rounded-md border border-line p-3 text-[15px]">
                {n.quote && <span className="lsat-text mb-1 block text-sm text-ink-3">“{n.quote.length > 70 ? `${n.quote.slice(0, 70).replace(/\s+\S*$/, "")}…` : n.quote}”</span>}
                {n.note}
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSel(Math.max(0, sel - 1))} disabled={sel === 0}>
              Previous
            </Button>
            <Button size="sm" onClick={() => setSel(Math.min(essay.paragraphs.length - 1, sel + 1))} disabled={sel === essay.paragraphs.length - 1}>
              Next paragraph
            </Button>
          </div>
        </aside>
      </div>

      <div className="rounded-md bg-bg-sunken p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{weak ? "What went wrong" : ok ? "What holds it back" : "What to take from it"}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
          {essay.takeaways.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Tabs across several essays, with the prompt each one answers shown above it. */
export function EssayGallery({
  essays,
}: {
  essays: { essay: ModelEssay; words: number; prompt: { title: string; context?: string; issue: string; perspectives: { label: string; text: string }[] } }[];
}) {
  const [i, setI] = useState(0);
  const cur = essays[i];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sample essays">
        {essays.map((e, k) => (
          <button
            key={e.essay.id}
            type="button"
            role="tab"
            aria-selected={k === i}
            onClick={() => setI(k)}
            className={cn("focus-ring rounded-[var(--radius)] border px-3 py-2 text-left text-sm", k === i ? "border-accent bg-accent-soft font-medium" : "border-line hover:border-line-strong")}
          >
            <span className="block">{e.essay.label}</span>
            <span className="block text-xs font-normal text-ink-3">{e.prompt.title}</span>
          </button>
        ))}
      </div>
      <details className="rounded-md border border-line p-4" open>
        <summary className="cursor-pointer font-semibold">The prompt: {cur.prompt.title}</summary>
        <div className="mt-3 space-y-2 text-[15px]">
          {cur.prompt.context && <p className="lsat-text">{cur.prompt.context}</p>}
          <p className="lsat-text font-semibold">{cur.prompt.issue}</p>
          <ul className="space-y-1.5">
            {cur.prompt.perspectives.map((pp) => (
              <li key={pp.label} className="lsat-text">
                <span className="font-semibold">Perspective {pp.label}.</span> {pp.text}
              </li>
            ))}
          </ul>
        </div>
      </details>
      <AnnotatedEssay key={cur.essay.id} essay={cur.essay} words={cur.words} />
    </div>
  );
}
