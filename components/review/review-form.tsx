"use client";

import { useActionState, useMemo, useState } from "react";
import { saveReview, type ReviewState } from "@/app/review/journal-actions";
import { Badge, Card, CardDescription, CardTitle, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { classify, type ErrorType } from "@/lib/engine/classify";
import { cn } from "@/lib/ui/cn";

const ERROR_OPTIONS: { id: ErrorType; label: string; hint: string }[] = [
  { id: "misread", label: "Misread", hint: "Missed a word, flipped the task, or mis-mapped who said what." },
  { id: "logic_gap", label: "Logic gap", hint: "Didn't see the structure or the pattern — a method problem." },
  { id: "trap", label: "Fell for a trap", hint: "Saw the gap but got pulled by a tempting wrong answer." },
  { id: "time_pressure", label: "Time pressure", hint: "Rushed, guessed, or bailed." },
  { id: "careless", label: "Careless", hint: "Knew it; slipped — switched off the right answer, misclicked." },
  { id: "guessed_right", label: "Guessed right", hint: "Correct but not for the right reasons." },
];

export function ReviewForm({
  attemptId,
  initial,
  context,
}: {
  attemptId: string;
  initial: {
    errorType: string | null;
    errorSuggested: string | null;
    trapSubtype: string | null;
    whyChose: string;
    whyRejectedRight: string;
    howPredict: string;
    killingWords: string;
    avoidNextTime: string;
    takeaway: string;
    reviewed: boolean;
    srsBox: number;
    nextDue: string | null;
  };
  context: { correct: boolean | null; guessFlag: boolean; seconds: number; confidence: string | null; changedFrom: string | null; myTrap: string | null };
}) {
  const suggestion = useMemo(
    () =>
      classify({
        correct: context.correct,
        guessFlag: context.guessFlag,
        seconds: context.seconds,
        confidence: context.confidence as "sure" | "leaning" | "guess" | null,
        changedFrom: context.changedFrom,
        myTrap: context.myTrap,
        difficulty: 2,
      }),
    [context],
  );
  const [errorType, setErrorType] = useState<ErrorType>((initial.errorType as ErrorType) ?? suggestion.errorType);
  const [state, action, pending] = useActionState<ReviewState, FormData>(saveReview, undefined);

  return (
    <Card>
      <CardTitle>Why did this happen?</CardTitle>
      <CardDescription>One tap to classify, a few words to make it stick. This is the data that decides what you drill next.</CardDescription>

      {!initial.errorType && (
        <p className="mt-3 rounded-md bg-info-soft px-3 py-2 text-sm text-info">
          <span className="font-semibold">Suggested: {ERROR_OPTIONS.find((o) => o.id === suggestion.errorType)?.label}.</span> {suggestion.reason}
        </p>
      )}

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="attemptId" value={attemptId} />
        <input type="hidden" name="errorType" value={errorType} />
        <input type="hidden" name="errorSuggested" value={initial.errorSuggested ?? suggestion.errorType} />
        <input type="hidden" name="trapSubtype" value={initial.trapSubtype ?? suggestion.trapSubtype ?? ""} />

        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Error type">
          {ERROR_OPTIONS.filter((o) => (context.correct ? o.id === "guessed_right" : o.id !== "guessed_right")).map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={errorType === o.id}
              onClick={() => setErrorType(o.id)}
              className={cn("focus-ring rounded-[var(--radius)] border p-3 text-left", errorType === o.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}
            >
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-ink-3">{o.hint}</span>
            </button>
          ))}
        </div>

        <Field name="whyChose" label="Why did you choose your answer?" defaultValue={initial.whyChose} />
        <Field name="whyRejectedRight" label="Why did you reject the right one?" defaultValue={initial.whyRejectedRight} />
        <Field name="killingWords" label="What exact words make the wrong answer wrong?" defaultValue={initial.killingWords} placeholder="e.g. “most” — the stimulus only supports “some”" />
        <Field name="howPredict" label="How could you have predicted the answer?" defaultValue={initial.howPredict} />
        <Field name="avoidNextTime" label="How will you avoid this next time?" defaultValue={initial.avoidNextTime} />
        <Field name="takeaway" label="One-line takeaway" defaultValue={initial.takeaway} required placeholder="The sentence you'd want to remember on test day" />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <Badge tone="neutral">Box {initial.srsBox}</Badge>
            {initial.nextDue && <span>re-drill {initial.nextDue}</span>}
            {initial.reviewed && <Badge tone="ok">Reviewed</Badge>}
          </div>
          <div className="flex gap-2">
            {state?.error && (
              <span role="alert" className="self-center text-sm text-bad">
                {state.error}
              </span>
            )}
            <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
              Save
            </Button>
            <Button type="submit" name="intent" value="done" disabled={pending}>
              {pending ? "Saving…" : "Save & mark reviewed"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function Field({ name, label, defaultValue, placeholder, required }: { name: string; label: string; defaultValue: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        rows={2}
        className="focus-ring w-full rounded-[var(--radius)] border border-line bg-bg-elev p-2.5 text-sm"
      />
    </div>
  );
}
