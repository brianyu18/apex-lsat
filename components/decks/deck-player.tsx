"use client";

/**
 * DeckPlayer — steps through a strategy deck one slide at a time.
 * Arrow keys or the buttons move between slides; inside a slide, the method,
 * worked example, traps and practice each reveal one step per click.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";
import type { Deck, Slide, WorkedSlide } from "@/lib/decks/schema";
import type { PracticeQuestion } from "@/lib/data/decks";

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const KIND_LABEL: Record<Slide["kind"], string> = { idea: "Idea", stems: "Spot it", method: "Method", worked: "Worked example", traps: "Traps", table: "Reference", practice: "Your turn", card: "Cheat card" };

export function DeckPlayer({ deck, practice, drillHref, typeLabels }: { deck: Deck; practice: PracticeQuestion[]; drillHref: string | null; typeLabels: Record<string, string> }) {
  const [i, setI] = useState(0);
  const n = deck.slides.length;
  const go = useCallback((k: number) => setI((cur) => Math.max(0, Math.min(n - 1, k ?? cur))), [n]);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(`deck:${deck.id}`));
      if (saved > 0 && saved < n) setI(saved);
    } catch {}
  }, [deck.id, n]);
  useEffect(() => {
    try {
      localStorage.setItem(`deck:${deck.id}`, String(i));
      const seen = JSON.parse(localStorage.getItem("deck:seen") ?? "{}") as Record<string, number>;
      seen[deck.id] = Math.max(seen[deck.id] ?? 0, Math.round(((i + 1) / n) * 100));
      localStorage.setItem("deck:seen", JSON.stringify(seen));
    } catch {}
  }, [deck.id, i, n]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i]);

  const s = deck.slides[i];
  return (
    <div className="space-y-4" data-testid="deck-player">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="neutral">{KIND_LABEL[s.kind]}</Badge>
        <span className="text-sm tabular-nums text-ink-3">
          Slide {i + 1} of {n}
        </span>
        <div className="min-w-[120px] flex-1">
          <Progress value={((i + 1) / n) * 100} />
        </div>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label="Slides">
        {deck.slides.map((sl, k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => go(k)}
              aria-current={k === i ? "step" : undefined}
              aria-label={`Slide ${k + 1}: ${sl.title}`}
              title={sl.title}
              className={cn("focus-ring h-2.5 w-6 rounded-full", k === i ? "bg-accent" : k < i ? "bg-ok" : "bg-line hover:bg-line-strong")}
            />
          </li>
        ))}
      </ol>

      <section key={i} className="card min-h-[420px] p-5 sm:p-7" aria-live="polite" aria-label={s.title}>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">{s.title}</h2>
        <SlideBody slide={s} practice={practice} typeLabels={typeLabels} drillHref={drillHref} />
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => go(i - 1)} disabled={i === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <span className="hidden text-xs text-ink-3 sm:inline">← → keys move between slides</span>
        {i < n - 1 ? (
          <Button onClick={() => go(i + 1)}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : drillHref ? (
          <Button asChild>
            <Link href={drillHref}>Drill this type</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/learn/decks">All decks</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function SlideBody({ slide, practice, typeLabels, drillHref }: { slide: Slide; practice: PracticeQuestion[]; typeLabels: Record<string, string>; drillHref: string | null }) {
  switch (slide.kind) {
    case "idea":
      return (
        <div className="max-w-2xl space-y-3 text-[16px] leading-relaxed">
          {slide.body.map((p, k) => (
            <p key={k}>{p}</p>
          ))}
          {slide.callout && <p className="rounded-md border-l-4 border-accent bg-accent-soft px-4 py-3 font-medium">{slide.callout}</p>}
        </div>
      );
    case "stems":
      return (
        <div className="space-y-3">
          <ul className="space-y-2">
            {slide.stems.map((st, k) => (
              <li key={k} className="lsat-text rounded-md bg-bg-sunken px-4 py-2.5 text-[15px]">
                “{st}”
              </li>
            ))}
          </ul>
          {slide.note && <p className="text-sm text-ink-2">{slide.note}</p>}
        </div>
      );
    case "method":
      return <MethodSlide steps={slide.steps} />;
    case "worked":
      return <WorkedSlideView w={slide} />;
    case "traps":
      return <TrapsSlide traps={slide.traps} />;
    case "table":
      return (
        <div className="space-y-3">
          {/* phones: one card per row, each cell labelled with its column */}
          <div className="space-y-2 sm:hidden">
            {slide.rows.map((r, k) => (
              <div key={k} className="rounded-md border border-line p-3 text-sm">
                {r.map((c, j) =>
                  !c ? null : j === 0 ? (
                    <p key={j} className="font-semibold">
                      {c}
                    </p>
                  ) : (
                    <p key={j} className="mt-1">
                      <span className="text-xs uppercase tracking-wider text-ink-3">{slide.head[j]}: </span>
                      {c}
                    </p>
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-3">
                  {slide.head.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((r, k) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    {r.map((c, j) => (
                      <td key={j} className={cn("px-3 py-2 align-top", j === 0 && "font-medium")}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {slide.note && <p className="text-sm text-ink-2">{slide.note}</p>}
        </div>
      );
    case "practice":
      return <PracticeSlide questions={practice.slice(0, slide.count)} typeLabels={typeLabels} />;
    case "card":
      return (
        <div className="space-y-4">
          <ul className="space-y-2">
            {slide.lines.map((l, k) => (
              <li key={k} className="flex gap-3 text-[15px]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                <span>{l}</span>
              </li>
            ))}
          </ul>
          {drillHref && (
            <Link href={drillHref} className="inline-block text-sm font-medium text-accent hover:underline">
              Drill this type now: 10 questions, misses go to Review →
            </Link>
          )}
        </div>
      );
  }
}

function MethodSlide({ steps }: { steps: { label: string; do: string }[] }) {
  const [shown, setShown] = useState(1);
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {steps.slice(0, shown).map((s, k) => (
          <li key={k} className="flex gap-3 rounded-md border border-line p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">{k + 1}</span>
            <div>
              <p className="font-semibold">{s.label}</p>
              <p className="mt-0.5 text-[15px] text-ink-2">{s.do}</p>
            </div>
          </li>
        ))}
      </ol>
      {shown < steps.length ? (
        <Button variant="outline" size="sm" onClick={() => setShown(shown + 1)}>
          Show step {shown + 1} of {steps.length}
        </Button>
      ) : (
        <p className="text-sm text-ink-3">That’s the whole method. Next, watch it run on a question.</p>
      )}
    </div>
  );
}

function Highlighted({ text, phrase }: { text: string; phrase?: string }) {
  if (!phrase) return <>{text}</>;
  const at = text.indexOf(phrase);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-warn-soft px-0.5 text-ink ring-1 ring-warn">{phrase}</mark>
      {text.slice(at + phrase.length)}
    </>
  );
}

function WorkedSlideView({ w }: { w: WorkedSlide }) {
  const [step, setStep] = useState(0);
  const revealed = step >= w.steps.length;
  const hl = revealed ? undefined : w.steps[step]?.highlight;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="min-w-0 space-y-3">
        {w.passage && (
          <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md bg-bg-sunken p-4 text-[15px] leading-relaxed" data-testid="worked-passage">
            {w.passage.title && <p className="font-semibold">{w.passage.title}</p>}
            {w.passage.paragraphsB && <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Passage A</p>}
            {w.passage.paragraphs.map((p, k) => (
              <p key={k} className="lsat-text">
                <Highlighted text={p} phrase={hl} />
              </p>
            ))}
            {w.passage.paragraphsB && <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Passage B</p>}
            {w.passage.paragraphsB?.map((p, k) => (
              <p key={`b${k}`} className="lsat-text">
                <Highlighted text={p} phrase={hl} />
              </p>
            ))}
          </div>
        )}
        {w.stimulus && (
          <p className="lsat-text whitespace-pre-line text-[15px] leading-relaxed" data-testid="worked-stimulus">
            <Highlighted text={w.stimulus} phrase={hl} />
          </p>
        )}
        <p className="lsat-text font-semibold">{w.stem}</p>
        <ul className="space-y-1.5" aria-label="Answer choices">
          {LETTERS.map((l) => {
            const right = revealed && l === w.answer;
            return (
              <li key={l} className={cn("rounded-md border px-3 py-2 text-[15px]", right ? "border-ok bg-ok-soft" : "border-line")}>
                <span className="mr-2 font-semibold">({l})</span>
                {w.choices[l]}
                {revealed && <p className={cn("mt-1 text-sm", right ? "text-ok" : "text-ink-3")}>{w.why[l]}</p>}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="space-y-3">
        <ol className="space-y-2">
          {w.steps.map((s, k) => (
            <li
              key={k}
              className={cn("rounded-md border p-3 transition-opacity", k === step ? "border-accent bg-accent-soft" : k < step ? "border-line" : "border-dashed border-line opacity-40")}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Step {k + 1} · {s.label}
              </p>
              {k <= step && <p className="mt-1 text-[15px]">{s.note}</p>}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {!revealed ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              {step === w.steps.length - 1 ? "Reveal the answer" : "Next step"}
            </Button>
          ) : (
            <p className="text-sm font-medium text-ok">Answer: ({w.answer}). Each choice now shows why it’s right or wrong.</p>
          )}
          {step > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setStep(0)}>
              Start over
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrapsSlide({ traps }: { traps: { name: string; tell: string; example?: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Tap a trap to see how to spot it.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {traps.map((t, k) => {
          const isOpen = open.has(k);
          return (
            <button
              key={k}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => (o.has(k) ? new Set([...o].filter((x) => x !== k)) : new Set([...o, k])))}
              className={cn("focus-ring rounded-md border p-4 text-left", isOpen ? "border-bad bg-bad-soft" : "border-line hover:border-line-strong")}
            >
              <p className="font-semibold">{t.name}</p>
              {isOpen ? (
                <>
                  <p className="mt-1 text-[15px]">{t.tell}</p>
                  {t.example && <p className="lsat-text mt-2 text-sm text-ink-2">{t.example}</p>}
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-3">How to spot it →</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PracticeSlide({ questions, typeLabels }: { questions: PracticeQuestion[]; typeLabels: Record<string, string> }) {
  const [k, setK] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  if (!questions.length) return <p className="text-ink-2">No bank questions of this type are loaded yet. Use the drill link at the end of the deck.</p>;
  if (k >= questions.length)
    return (
      <div className="space-y-2">
        <p className="text-lg font-semibold">
          {score} of {questions.length} right
        </p>
        <p className="text-ink-2">Practice here isn’t recorded. The drill at the end of the deck saves your answers and sends misses to Review.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setK(0);
            setScore(0);
            setPick(null);
            setChecked(false);
          }}
        >
          Try these again
        </Button>
      </div>
    );
  const q = questions[k];
  const right = checked && pick === q.answer;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]" data-testid="practice">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">
            Question {k + 1} of {questions.length}
          </Badge>
          <Badge tone="neutral">{typeLabels[q.type] ?? q.type}</Badge>
          <Badge tone="neutral">Level {q.difficulty}</Badge>
        </div>
        {q.passage && (
          <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-md bg-bg-sunken p-4 text-[15px] leading-relaxed">
            {q.passage.paragraphsB && <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Passage A</p>}
            {q.passage.paragraphs.map((p, j) => (
              <p key={j} className="lsat-text">
                {p}
              </p>
            ))}
            {q.passage.paragraphsB && <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Passage B</p>}
            {q.passage.paragraphsB?.map((p, j) => (
              <p key={`b${j}`} className="lsat-text">
                {p}
              </p>
            ))}
          </div>
        )}
        {q.stimulus && <p className="lsat-text whitespace-pre-line text-[15px] leading-relaxed">{q.stimulus}</p>}
        <p className="lsat-text font-semibold">{q.stem}</p>
      </div>
      <div className="space-y-2">
        <ul className="space-y-1.5" aria-label="Answer choices">
          {LETTERS.map((l) => {
            const isKey = checked && l === q.answer;
            const isWrongPick = checked && l === pick && l !== q.answer;
            return (
              <li key={l}>
                <button
                  type="button"
                  disabled={checked}
                  onClick={() => setPick(l)}
                  aria-pressed={pick === l}
                  className={cn(
                    "focus-ring w-full rounded-md border px-3 py-2 text-left text-[15px]",
                    isKey ? "border-ok bg-ok-soft" : isWrongPick ? "border-bad bg-bad-soft" : pick === l ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="mr-2 font-semibold">({l})</span>
                  {q.choices[l]}
                  {checked && q.explanations?.[l] && <span className={cn("mt-1 block text-sm", isKey ? "text-ok" : "text-ink-3")}>{q.explanations[l]}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {!checked ? (
          <Button
            size="sm"
            disabled={!pick}
            onClick={() => {
              setChecked(true);
              if (pick === q.answer) setScore(score + 1);
            }}
          >
            Check answer
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className={cn("flex items-center gap-1 text-sm font-medium", right ? "text-ok" : "text-bad")}>
              {right ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {right ? "Right." : `The answer is (${q.answer}).`}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setK(k + 1);
                setPick(null);
                setChecked(false);
              }}
            >
              {k + 1 < questions.length ? "Next question" : "See score"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
