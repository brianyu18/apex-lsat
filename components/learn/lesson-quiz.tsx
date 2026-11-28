"use client";

/**
 * LessonQuiz — the check for lessons that teach the test or the program
 * itself (Unit 0). Five questions on the lesson, one at a time; every choice
 * shows why it is right or wrong once you answer. 4 of 5 completes the lesson.
 */
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type Q = {
  prompt: string;
  choices: Partial<Record<string, string>>;
  answer: string;
  why: Partial<Record<string, string>>;
};

export function LessonQuiz({
  lessonId,
  questions,
  nextHref,
}: {
  lessonId: string;
  questions: Q[];
  nextHref: string | null;
}) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<(string | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<{ score: number; complete: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const q = questions[i];
  const pick = picks[i];
  const score = picks.filter((p, k) => p === questions[k].answer).length;
  const pass = Math.min(4, questions.length);

  async function finish() {
    setSaving(true);
    let complete = score >= pass;
    try {
      const r = await fetch("/api/lessons/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId, score, total: questions.length }),
      });
      complete = ((await r.json()) as { complete: boolean }).complete;
    } catch {
      /* offline: show the score; progress saves next time */
    }
    setResult({ score, complete });
    setSaving(false);
  }

  if (result) {
    return (
      <div className="space-y-3" data-testid="lesson-quiz-result">
        <p className="text-lg font-semibold tabular-nums">
          {result.score} of {questions.length}
        </p>
        <p className="text-[15px] text-ink-2">
          {result.complete
            ? "Lesson complete."
            : `You need ${pass} of ${questions.length} to complete the lesson. Reread the sections behind the misses and try again.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {result.complete && nextHref && (
            <Button asChild>
              <Link href={nextHref}>Next lesson</Link>
            </Button>
          )}
          <Button
            variant={result.complete ? "ghost" : "primary"}
            onClick={() => {
              setPicks(questions.map(() => null));
              setI(0);
              setResult(null);
            }}
          >
            Take it again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="lesson-quiz">
      <div className="flex items-center gap-2 text-sm text-ink-3">
        <Badge tone="neutral">
          Question {i + 1} of {questions.length}
        </Badge>
        <span className="tabular-nums">{score} right so far</span>
      </div>
      <p className="font-medium">{q.prompt}</p>
      <ul className="space-y-2" aria-label="Answer choices">
        {Object.entries(q.choices).map(([l, text]) => {
          const isKey = l === q.answer;
          const mine = pick === l;
          return (
            <li key={l}>
              <button
                type="button"
                disabled={pick != null}
                onClick={() => setPicks(picks.map((p, k) => (k === i ? l : p)))}
                className={cn(
                  "focus-ring block w-full rounded-md border px-3 py-2 text-left text-[15px] disabled:cursor-default",
                  pick == null
                    ? "border-line hover:border-line-strong"
                    : isKey
                      ? "border-ok bg-ok-soft"
                      : mine
                        ? "border-bad bg-bad-soft"
                        : "border-line",
                )}
              >
                <span className="mr-2 font-semibold">({l})</span>
                {text}
                {pick != null && (
                  <span className={cn("mt-1 block text-sm", isKey ? "text-ok" : "text-ink-3")}>
                    {q.why[l]}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {pick != null && (
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn("text-sm font-medium", pick === q.answer ? "text-ok" : "text-bad")}
            data-testid="quiz-verdict"
          >
            {pick === q.answer ? "Right." : `The answer is (${q.answer}).`}
          </p>
          {i < questions.length - 1 ? (
            <Button size="sm" onClick={() => setI(i + 1)}>
              Next question
            </Button>
          ) : (
            <Button size="sm" onClick={finish} disabled={saving}>
              {saving ? "Saving…" : "See my score"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
