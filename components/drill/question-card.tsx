"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Flag } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { TRAP_LABELS, type LRType, type TrapPattern } from "@/lib/content/taxonomy";
import { typeLabel } from "@/lib/content/labels";
import { QuickClassify } from "./quick-classify";
import type { Confidence, SafeQuestion, SubmitResponse } from "./types";

const LETTERS = ["A", "B", "C", "D", "E"] as const;


export function QuestionCard({
  question,
  index,
  total,
  predictionMode,
  onSubmit,
  result,
  onNext,
  onToggleGuess,
  showTimer = false,
}: {
  question: SafeQuestion;
  index: number;
  total: number;
  predictionMode: boolean;
  onSubmit: (payload: { answer: string; confidence: Confidence; seconds: number; prediction: string | null; changedFrom: string | null }) => Promise<void>;
  result: SubmitResponse | null;
  onNext: () => void;
  onToggleGuess: (flag: boolean) => void;
  showTimer?: boolean;
}) {
  const [stage, setStage] = useState<"predict" | "answer">(predictionMode ? "predict" : "answer");
  const [prediction, setPrediction] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [firstPick, setFirstPick] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [explanationOpened, setExplanationOpened] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [readLock, setReadLock] = useState(0); // seconds left before Next unlocks after a miss
  const start = useRef<number>(Date.now());

  useEffect(() => {
    start.current = Date.now();
    setStage(predictionMode ? "predict" : "answer");
    setPrediction("");
    setSelected(null);
    setFirstPick(null);
    setEliminated(new Set());
    setConfidence(null);
    setError(null);
    setExplanationOpened(false);
    setElapsed(0);
  }, [question.id, predictionMode]);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [result, question.id]);

  // After a miss (or a lucky guess), hold Next for a few seconds so the explanation gets read.
  useEffect(() => {
    if (!result || (result.correct && !result.guessFlag)) {
      setReadLock(0);
      return;
    }
    setReadLock(6);
    const t = setInterval(() => setReadLock((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [result]);

  function pick(l: string) {
    if (result) return;
    if (!firstPick) setFirstPick(l);
    setSelected(l);
    setError(null);
  }
  function toggleEliminate(l: string) {
    if (result) return;
    setEliminated((s) => {
      const n = new Set(s);
      if (n.has(l)) n.delete(l);
      else n.add(l);
      return n;
    });
  }

  async function submit() {
    if (!selected) return setError("Pick an answer first.");
    if (!confidence) return setError("How sure are you? Pick sure, leaning, or guess.");
    setSubmitting(true);
    const seconds = (Date.now() - start.current) / 1000;
    await onSubmit({
      answer: selected,
      confidence,
      seconds,
      prediction: predictionMode ? prediction : null,
      changedFrom: firstPick && firstPick !== selected ? firstPick : null,
    });
    setSubmitting(false);
  }

  const key = result?.answer ?? null;
  const missed = result && result.correct === false;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left: question */}
      <section aria-label="Question" className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink-2">
              {index + 1}
              {total ? ` / ${total}` : ""}
            </span>
            <Badge>{typeLabel(question.type)}</Badge>
            <Badge tone="neutral">L{question.difficulty}</Badge>
          </div>
          {showTimer && !result && <span className="tabular-nums">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>}
        </div>

        {question.stimulus && <p className="lsat-text whitespace-pre-line text-ink">{question.stimulus}</p>}

        {stage === "predict" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-ink-2">
              {question.section === "LR" ? "Before you see the question: what's wrong with this argument, or what do these facts prove?" : "In your own words, what's the main point?"}
            </p>
            <textarea
              className="focus-ring min-h-24 w-full rounded-[var(--radius)] border border-line bg-bg-elev p-3 text-sm"
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              placeholder="One or two sentences…"
              aria-label="Your prediction"
            />
            <Button onClick={() => setStage("answer")} disabled={prediction.trim().length < 5}>
              Reveal the question
            </Button>
          </div>
        ) : (
          <>
            <p className="lsat-text mt-5 font-medium text-ink">{question.stem}</p>
            {predictionMode && prediction && (
              <p className="mt-2 rounded-md bg-bg-sunken px-3 py-2 text-sm text-ink-2">
                <span className="font-medium">Your prediction:</span> {prediction}
              </p>
            )}
            <ol className="mt-4 space-y-2" aria-label="Answer choices">
              {LETTERS.map((l) => {
                const text = question.choices?.[l] ?? "";
                const isSel = selected === l;
                const isKey = key === l;
                const struck = eliminated.has(l) && !result;
                return (
                  <li key={l} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => pick(l)}
                      disabled={!!result}
                      aria-pressed={isSel}
                      className={cn(
                        "focus-ring flex flex-1 items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left text-[15px] leading-snug transition-colors",
                        !result && isSel && "border-accent bg-accent-soft",
                        !result && !isSel && "border-line hover:border-line-strong",
                        result && isKey && "border-ok bg-ok-soft",
                        result && isSel && !isKey && "border-bad bg-bad-soft",
                        result && !isSel && !isKey && "border-line opacity-70",
                        struck && "line-through opacity-50",
                      )}
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-semibold">
                        {result && isKey ? <Check className="h-3.5 w-3.5" /> : result && isSel && !isKey ? <X className="h-3.5 w-3.5" /> : l}
                      </span>
                      <span className="lsat-text text-[15px]">{text}</span>
                    </button>
                    {!result && (
                      <button
                        type="button"
                        onClick={() => toggleEliminate(l)}
                        aria-label={`${struck ? "Restore" : "Eliminate"} choice ${l}`}
                        className="focus-ring w-8 shrink-0 rounded-md text-ink-3 hover:bg-bg-sunken hover:text-ink"
                        title="Eliminate"
                      >
                        <X className="mx-auto h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>

            {!result && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex rounded-[var(--radius)] border border-line p-1" role="radiogroup" aria-label="Confidence">
                  {(["sure", "leaning", "guess"] as Confidence[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={confidence === c}
                      onClick={() => {
                        setConfidence(c);
                        setError(null);
                      }}
                      className={cn(
                        "focus-ring rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-sm capitalize",
                        confidence === c ? "bg-ink text-bg" : "text-ink-2 hover:bg-bg-sunken",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? "Checking…" : "Check answer"}
                </Button>
                {error && (
                  <span role="alert" className="text-sm text-bad">
                    {error}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Right: result + explanation */}
      {result && (
        <section aria-label="Explanation" className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {result.correct ? <Badge tone="ok">Correct</Badge> : <Badge tone="bad">Missed — key is {key}</Badge>}
            {result.guessFlag && (
              <button
                type="button"
                onClick={() => onToggleGuess(false)}
                className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn"
                title="Answered in under 10 seconds — counted as a guess and excluded from accuracy. Tap to count it."
              >
                <Flag className="h-3 w-3" /> Counted as a guess · tap to count it
              </button>
            )}
          </div>

          <details
            className="group mt-4"
            open={!!missed || !!result.guessFlag || explanationOpened}
            onToggle={(e) => setExplanationOpened((e.target as HTMLDetailsElement).open)}
          >
            <summary className="focus-ring cursor-pointer list-none text-sm font-medium text-accent">
              {explanationOpened || missed || result.guessFlag ? "Explanation" : "Show explanation"}
            </summary>
            <ol className="mt-3 space-y-3">
              {LETTERS.map((l) => {
                const isKey = key === l;
                const trap = result.trapPatterns?.[l] as TrapPattern | undefined;
                return (
                  <li key={l} className={cn("rounded-md border px-3 py-2 text-sm", isKey ? "border-ok bg-ok-soft/50" : "border-line")}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold">{l}</span>
                      {isKey ? <Badge tone="ok">Correct</Badge> : trap ? <Badge tone="neutral">{TRAP_LABELS[trap] ?? trap}</Badge> : null}
                      {selected === l && !isKey && <Badge tone="bad">Your pick</Badge>}
                    </div>
                    <p className="text-ink-2">{result.explanations?.[l]}</p>
                  </li>
                );
              })}
            </ol>
            {result.keyTakeaway && (
              <p className="mt-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
                <span className="font-semibold">Takeaway: </span>
                {result.keyTakeaway}
              </p>
            )}
          </details>

          {(missed || (result.correct && result.guessFlag)) && (
            <QuickClassify
              attemptId={result.attemptId}
              correct={result.correct}
              guessFlag={result.guessFlag}
              seconds={(Date.now() - start.current) / 1000}
              confidence={confidence}
              changedFrom={firstPick && firstPick !== selected ? firstPick : null}
              changedFromWasCorrect={!!firstPick && firstPick !== selected && firstPick === key}
              myTrap={selected && !result.correct ? (result.trapPatterns?.[selected] ?? null) : null}
              difficulty={question.difficulty}
            />
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-3">{missed ? "In your Review Inbox." : result.guessFlag ? "Guessed right — in your Review Inbox." : ""}</p>
            <Button onClick={onNext} disabled={readLock > 0} aria-disabled={readLock > 0}>
              {readLock > 0 ? `Read the explanation… ${readLock}` : "Next"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

export const CHOICE_LETTERS = LETTERS;
export { typeLabel };
export type { LRType };
