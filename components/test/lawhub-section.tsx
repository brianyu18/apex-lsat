"use client";

/**
 * LawHubSection — one timed section in the LawHub-style interface, LR or RC.
 * Controlled by a parent (section runner or PT runner). Calls onSubmit with
 * per-question answers/timing/flags when the clock runs out or the student submits.
 *
 * Interface parity with the June-2026 LawHub UI: top bar with section name,
 * question counter and hideable timer (not in last 5 minutes), highlight toggle,
 * flag, "Reset response", bottom navigator with flags, passage pane for RC with
 * passage switcher for comparative sets, no single-click eliminate (we keep the
 * explicit ✕ since LawHub shows strike-through via a toolbar).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Flag, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export type SecQ = { id: string; type: string; difficulty: number; stimulus: string | null; stem: string | null; choices: Record<string, string> | null; passageId?: string | null };
export type SecPassage = { id: string; title: string; comparative: boolean; paragraphs: string[]; paragraphsB: string[] | null };
export type SecAnswer = { questionId: string; answer: string | null; seconds: number; flagged: boolean; changedFrom: string | null; passageSeconds?: number | null };

type Local = { answer: string | null; seconds: number; flagged: boolean; changedFrom: string | null; eliminated: string[] };

export function LawHubSection({
  title,
  questions,
  passages,
  durationSec,
  onSubmit,
  sectionLabel,
}: {
  title: string;
  questions: SecQ[];
  passages?: SecPassage[];
  durationSec: number;
  onSubmit: (answers: SecAnswer[], elapsedSec: number) => void;
  sectionLabel?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [local, setLocal] = useState<Record<string, Local>>(() => Object.fromEntries(questions.map((q) => [q.id, blank()])));
  const [remaining, setRemaining] = useState(durationSec);
  const [hideTimer, setHideTimer] = useState(false);
  const [highlightOn, setHighlightOn] = useState(false);
  const [showB, setShowB] = useState<"A" | "B" | "both">("both");
  const startedAt = useRef(Date.now());
  const enteredAt = useRef(Date.now());
  const passageEntered = useRef<Record<string, number>>({});
  const passageTime = useRef<Record<string, number>>({});
  const submitted = useRef(false);
  const cur = questions[idx];
  const passage = cur?.passageId ? passages?.find((p) => p.id === cur.passageId) : undefined;

  const commit = useCallback(() => {
    if (!cur) return;
    const dt = (Date.now() - enteredAt.current) / 1000;
    setLocal((l) => ({ ...l, [cur.id]: { ...(l[cur.id] ?? blank()), seconds: (l[cur.id]?.seconds ?? 0) + dt } }));
    enteredAt.current = Date.now();
  }, [cur]);

  // passage dwell: time between first arriving at a passage's questions and answering its first question
  useEffect(() => {
    if (!passage) return;
    if (passageEntered.current[passage.id] == null) passageEntered.current[passage.id] = Date.now();
  }, [passage]);

  const finish = useCallback(
    (auto: boolean) => {
      if (submitted.current) return;
      if (!auto) {
        const un = questions.filter((q) => !local[q.id]?.answer).length;
        if (un > 0 && !confirm(`${un} unanswered. Submit anyway? Blanks score zero.`)) return;
      }
      submitted.current = true;
      const now = Date.now();
      const out: SecAnswer[] = questions.map((q, i) => {
        const a = local[q.id] ?? blank();
        const secs = i === idx ? a.seconds + (now - enteredAt.current) / 1000 : a.seconds;
        const firstOfPassage = q.passageId && questions.findIndex((x) => x.passageId === q.passageId) === i;
        return { questionId: q.id, answer: a.answer, seconds: Math.round(secs * 10) / 10, flagged: a.flagged, changedFrom: a.changedFrom, passageSeconds: firstOfPassage ? (passageTime.current[q.passageId!] ?? null) : null };
      });
      onSubmit(out, Math.floor((now - startedAt.current) / 1000));
    },
    [questions, local, idx, onSubmit],
  );

  useEffect(() => {
    const t = setInterval(() => {
      const left = durationSec - Math.floor((Date.now() - startedAt.current) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) finish(true);
    }, 500);
    return () => clearInterval(t);
  }, [durationSec, finish]);

  function go(i: number) {
    commit();
    setIdx(Math.max(0, Math.min(questions.length - 1, i)));
  }
  function pick(l: string) {
    if (!cur) return;
    if (cur.passageId && passageTime.current[cur.passageId] == null && passageEntered.current[cur.passageId] != null) {
      passageTime.current[cur.passageId] = (Date.now() - passageEntered.current[cur.passageId]) / 1000;
    }
    setLocal((prev) => {
      const p = prev[cur.id] ?? blank();
      const changedFrom = p.answer && p.answer !== l ? (p.changedFrom ?? p.answer) : p.changedFrom;
      return { ...prev, [cur.id]: { ...p, answer: l, changedFrom, eliminated: p.eliminated.filter((x) => x !== l) } };
    });
  }

  if (!cur) return null;
  const a = local[cur.id] ?? blank();
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const lastFive = remaining <= 300;

  return (
    <div className="-mx-4 -mt-6 flex min-h-dvh flex-col bg-bg-elev md:-mx-8" data-testid="section-shell">
      <div className="flex items-center justify-between border-b border-line bg-bg-sunken px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold">{sectionLabel ?? title}</span>
          <span className="text-ink-3">
            Question {idx + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setHighlightOn((h) => !h)} className={cn("focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-ink-2 hover:bg-bg-elev", highlightOn && "bg-warn-soft text-warn")} aria-pressed={highlightOn} aria-label="Highlight mode" title="Highlight: select text to highlight it">
            <Highlighter className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => !lastFive && setHideTimer((h) => !h)} className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-ink-2 hover:bg-bg-elev" aria-label={hideTimer ? "Show timer" : "Hide timer"} title={lastFive ? "Timer can't be hidden in the last 5 minutes" : ""}>
            {hideTimer && !lastFive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <span className={cn("ml-1 font-mono tabular-nums", lastFive && "font-semibold text-bad")} data-testid="timer">
            {hideTimer && !lastFive ? "––:––" : `${mm}:${ss}`}
          </span>
        </div>
      </div>

      <div className={cn("grid flex-1", (passage || cur.stimulus) && "lg:grid-cols-2")}>
        {(passage || cur.stimulus) && (
          <div className={cn("border-b border-line p-5 lg:border-b-0 lg:border-r", highlightOn && "selection:bg-warn-soft")} onMouseUp={highlightOn ? applyHighlight : undefined} data-testid={passage ? "passage-pane" : "stimulus-pane"}>
            {passage ? (
              <>
                {passage.comparative && passage.paragraphsB && (
                  <div className="mb-3 flex gap-1 text-xs">
                    {(["A", "B", "both"] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setShowB(v)} className={`focus-ring rounded-full border px-2.5 py-1 ${showB === v ? "border-ink bg-ink text-bg" : "border-line text-ink-2"}`}>
                        {v === "both" ? "Both" : `Passage ${v}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className={passage.comparative && showB === "both" ? "grid gap-5 xl:grid-cols-2" : ""}>
                  {(showB !== "B" || !passage.comparative) && (
                    <div>
                      {passage.comparative && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Passage A</p>}
                      {passage.paragraphs.map((p, i) => (
                        <p key={i} className="lsat-text mb-3">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                  {passage.comparative && passage.paragraphsB && showB !== "A" && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Passage B</p>
                      {passage.paragraphsB.map((p, i) => (
                        <p key={i} className="lsat-text mb-3">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="lsat-text whitespace-pre-line">{cur.stimulus}</p>
            )}
          </div>
        )}
        <div className="p-5">
          <p className="lsat-text font-medium">{cur.stem}</p>
          <ol className="mt-4 space-y-2" aria-label="Answer choices">
            {LETTERS.map((l) => {
              const sel = a.answer === l;
              const struck = a.eliminated.includes(l);
              return (
                <li key={l} className="flex items-stretch gap-2">
                  <button type="button" onClick={() => pick(l)} aria-pressed={sel} className={cn("focus-ring flex flex-1 items-start gap-3 rounded-md border px-3 py-2.5 text-left", sel ? "border-ink bg-bg-sunken" : "border-line hover:border-line-strong", struck && "line-through opacity-50")}>
                    <span className={cn("mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", sel ? "border-ink bg-ink text-bg" : "border-line-strong")}>{l}</span>
                    <span className="lsat-text text-[15px]">{cur.choices?.[l]}</span>
                  </button>
                  <button type="button" onClick={() => setLocal((prev) => { const p = prev[cur.id] ?? blank(); return { ...prev, [cur.id]: { ...p, eliminated: struck ? p.eliminated.filter((x) => x !== l) : [...p.eliminated, l] } }; })} className="focus-ring w-7 shrink-0 rounded-md text-xs text-ink-3 hover:bg-bg-sunken" aria-label={`${struck ? "Restore" : "Eliminate"} ${l}`}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex items-center gap-2">
            <Button variant={a.flagged ? "secondary" : "outline"} size="sm" onClick={() => setLocal((prev) => ({ ...prev, [cur.id]: { ...(prev[cur.id] ?? blank()), flagged: !(prev[cur.id]?.flagged ?? false) } }))} aria-pressed={a.flagged}>
              <Flag className={cn("h-4 w-4", a.flagged && "fill-current")} /> {a.flagged ? "Flagged for review" : "Flag for review"}
            </Button>
            {a.answer && (
              <Button variant="ghost" size="sm" onClick={() => setLocal((prev) => ({ ...prev, [cur.id]: { ...(prev[cur.id] ?? blank()), answer: null } }))}>
                Reset response
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-bg-sunken px-3 py-2" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous question">
            <ChevronLeft />
          </Button>
          <ol className="flex flex-1 flex-wrap justify-center gap-1" aria-label="Question navigator">
            {questions.map((q, i) => {
              const qa = local[q.id];
              const newPassage = q.passageId && i > 0 && questions[i - 1].passageId !== q.passageId;
              return (
                <li key={q.id} className={cn(newPassage && "ml-2 border-l border-line pl-2")}>
                  <button type="button" onClick={() => go(i)} aria-label={`Question ${i + 1}${qa?.answer ? ", answered" : ""}${qa?.flagged ? ", flagged" : ""}`} aria-current={i === idx ? "true" : undefined} className={cn("focus-ring relative h-7 w-7 rounded text-[11px] font-medium tabular-nums", i === idx ? "bg-ink text-bg" : qa?.answer ? "bg-line text-ink" : "border border-line text-ink-3")}>
                    {i + 1}
                    {qa?.flagged && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ol>
          {idx < questions.length - 1 ? (
            <Button size="sm" onClick={() => go(idx + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => finish(false)}>
              Submit section
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Wrap the current selection in a <mark>. Only inside the passage/stimulus pane. */
function applyHighlight() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  try {
    const mark = document.createElement("mark");
    mark.className = "rounded bg-warn-soft px-0.5";
    range.surroundContents(mark);
  } catch {
    /* selection crosses element boundaries — ignore, as LawHub does */
  }
  sel.removeAllRanges();
}

function blank(): Local {
  return { answer: null, seconds: 0, flagged: false, changedFrom: null, eliminated: [] };
}
