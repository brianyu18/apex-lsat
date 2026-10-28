"use client";

/**
 * OutlineBuilder — the 15-minute prewriting scaffold for LSAT Argumentative
 * Writing. Given a prompt (issue + perspectives), the student commits to a
 * position, drafts two reasons with support, picks the strongest opposing
 * perspective to address, and writes a one-line thesis. The result is a
 * paragraph plan they can carry into the 35-minute essay.
 *
 * Used standalone in lessons (sandbox) and inside /test/writing (controlled,
 * via `value`/`onChange`).
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";

export interface WritingPrompt {
  title: string;
  issue: string; // the debatable question in one or two sentences
  context?: string; // optional background paragraph
  perspectives: { label: string; text: string }[]; // 3–4 short stances
}

export interface Outline {
  position: string;
  thesis: string;
  reasons: { claim: string; support: string }[];
  counter: { perspective: string; concession: string; rebuttal: string };
}

export const EMPTY_OUTLINE: Outline = {
  position: "",
  thesis: "",
  reasons: [
    { claim: "", support: "" },
    { claim: "", support: "" },
  ],
  counter: { perspective: "", concession: "", rebuttal: "" },
};

export function outlineScore(o: Outline) {
  const checks = [
    { ok: o.position.trim().length > 0, label: "Position chosen" },
    { ok: o.thesis.trim().split(/\s+/).filter(Boolean).length >= 8 && !/^(i think|i believe|in my opinion)/i.test(o.thesis.trim()), label: "Thesis is a full, direct claim (≥ 8 words, no 'I think')" },
    { ok: o.reasons.filter((r) => r.claim.trim()).length >= 2, label: "Two distinct reasons" },
    { ok: o.reasons.filter((r) => r.support.trim().length >= 20).length >= 2, label: "Each reason has concrete support (example, mechanism, or consequence)" },
    { ok: o.counter.perspective.trim().length > 0, label: "An opposing perspective named" },
    { ok: o.counter.concession.trim().length >= 15, label: "Concede what is right about it" },
    { ok: o.counter.rebuttal.trim().length >= 20, label: "Explain why your position still holds" },
  ];
  return { checks, done: checks.filter((c) => c.ok).length, total: checks.length };
}

export function OutlineBuilder({ prompt, value, onChange, showScore = true }: { prompt: WritingPrompt; value?: Outline; onChange?: (o: Outline) => void; showScore?: boolean }) {
  const [local, setLocal] = useState<Outline>(value ?? EMPTY_OUTLINE);
  useEffect(() => {
    if (value) setLocal(value);
  }, [value]);
  const o = value ?? local;
  function set(next: Outline) {
    setLocal(next);
    onChange?.(next);
  }
  const score = outlineScore(o);

  return (
    <div className="card not-prose my-6 p-4 sm:p-5" data-testid="outline-builder">
      <p className="text-sm font-semibold">{prompt.title}</p>
      {prompt.context && <p className="lsat-text mt-2 text-[15px] text-ink-2">{prompt.context}</p>}
      <p className="lsat-text mt-2 text-[15px] font-medium">{prompt.issue}</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {prompt.perspectives.map((p) => (
          <li key={p.label} className="rounded-md border border-line bg-bg-sunken p-3 text-sm">
            <span className="font-semibold">{p.label}. </span>
            <span className="text-ink-2">{p.text}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 space-y-4">
        <Field label="1 · Your position" hint="Pick a side of the issue. You may agree with one perspective, combine two, or stake out your own — but commit.">
          <div className="flex flex-wrap gap-1.5">
            {prompt.perspectives.map((p) => (
              <button key={p.label} type="button" onClick={() => set({ ...o, position: p.label })} aria-pressed={o.position === p.label} className={cn("focus-ring rounded-md border px-3 py-1.5 text-sm", o.position === p.label ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-line-strong")}>
                Perspective {p.label}
              </button>
            ))}
            <button type="button" onClick={() => set({ ...o, position: "own" })} aria-pressed={o.position === "own"} className={cn("focus-ring rounded-md border px-3 py-1.5 text-sm", o.position === "own" ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-line-strong")}>
              My own position
            </button>
          </div>
        </Field>
        <Field label="2 · Thesis (one sentence)" hint="State the claim as a claim. Not 'I think X is better' — 'X should be adopted because A and B.'">
          <textarea aria-label="Thesis" rows={2} value={o.thesis} onChange={(e) => set({ ...o, thesis: e.target.value })} className="focus-ring w-full rounded-md border border-line bg-bg-elev p-2.5 text-sm" />
        </Field>
        {o.reasons.map((r, i) => (
          <Field key={i} label={`${3 + i} · Reason ${i + 1}`} hint={i === 0 ? "Your strongest reason first. Then the support: a concrete example, a mechanism (why it works), or a consequence." : "A second, distinct reason — not the first one reworded."}>
            <input aria-label={`Reason ${i + 1} claim`} value={r.claim} onChange={(e) => set({ ...o, reasons: o.reasons.map((x, j) => (j === i ? { ...x, claim: e.target.value } : x)) })} placeholder="Claim" className="focus-ring mb-2 w-full rounded-md border border-line bg-bg-elev p-2.5 text-sm" />
            <textarea aria-label={`Reason ${i + 1} support`} rows={2} value={r.support} onChange={(e) => set({ ...o, reasons: o.reasons.map((x, j) => (j === i ? { ...x, support: e.target.value } : x)) })} placeholder="Support: example / mechanism / consequence" className="focus-ring w-full rounded-md border border-line bg-bg-elev p-2.5 text-sm" />
          </Field>
        ))}
        <Field label="5 · The best objection" hint="Pick the perspective that most threatens your thesis. Concede what is right about it, then explain why your position still holds.">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {prompt.perspectives
              .filter((p) => p.label !== o.position)
              .map((p) => (
                <button key={p.label} type="button" onClick={() => set({ ...o, counter: { ...o.counter, perspective: p.label } })} aria-pressed={o.counter.perspective === p.label} className={cn("focus-ring rounded-md border px-3 py-1.5 text-sm", o.counter.perspective === p.label ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-line-strong")}>
                  Perspective {p.label}
                </button>
              ))}
          </div>
          <textarea aria-label="Concession" rows={2} value={o.counter.concession} onChange={(e) => set({ ...o, counter: { ...o.counter, concession: e.target.value } })} placeholder="What this perspective gets right…" className="focus-ring mb-2 w-full rounded-md border border-line bg-bg-elev p-2.5 text-sm" />
          <textarea aria-label="Rebuttal" rows={2} value={o.counter.rebuttal} onChange={(e) => set({ ...o, counter: { ...o.counter, rebuttal: e.target.value } })} placeholder="…but my position still holds because…" className="focus-ring w-full rounded-md border border-line bg-bg-elev p-2.5 text-sm" />
        </Field>
      </div>

      {showScore && (
        <div className="mt-5 rounded-md bg-bg-sunken p-3">
          <p className="text-sm font-semibold">
            Outline check · {score.done}/{score.total}
          </p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {score.checks.map((c) => (
              <li key={c.label} className={cn("flex items-start gap-2", c.ok ? "text-ok" : "text-ink-3")}>
                <span aria-hidden>{c.ok ? "✓" : "○"}</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">Paragraph plan: intro with thesis → reason 1 → reason 2 → objection and reply → one-sentence close. Five paragraphs, 400–600 words, 35 minutes.</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mb-2 text-xs text-ink-3">{hint}</p>
      {children}
    </div>
  );
}
