import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttemptDetail } from "@/lib/data/attempts";
import { Badge, Card } from "@/components/ui/primitives";
import { typeLabel } from "@/lib/content/labels";
import { TRAP_LABELS, type TrapPattern } from "@/lib/content/taxonomy";
import { ReviewForm } from "@/components/review/review-form";

export const dynamic = "force-dynamic";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export default async function ReviewDetail({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const d = await getAttemptDetail(attemptId);
  if (!d) notFound();
  const { attempt, question, miss } = d;
  const key = question.answer;

  return (
    <div className="space-y-5">
      <Link href="/review" className="text-sm text-ink-3 hover:text-ink">
        ← Review Inbox
      </Link>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge>{typeLabel(question.type)}</Badge>
            <Badge tone="neutral">L{question.difficulty}</Badge>
            {attempt.correct ? <Badge tone="ok">Correct</Badge> : <Badge tone="bad">Missed</Badge>}
            {attempt.guessFlag && <Badge tone="warn">Guess</Badge>}
            <span className="text-ink-3">
              {Math.round(attempt.seconds ?? 0)}s · {attempt.confidence ?? "no confidence"}
            </span>
          </div>
          {question.stimulus && <p className="lsat-text whitespace-pre-line">{question.stimulus}</p>}
          <p className="lsat-text mt-4 font-medium">{question.stem}</p>
          <ol className="mt-3 space-y-2">
            {LETTERS.map((l) => {
              const isKey = key === l;
              const mine = attempt.answer === l;
              const trap = question.trapPatterns?.[l] as TrapPattern | undefined;
              return (
                <li key={l} className={`rounded-md border px-3 py-2 text-sm ${isKey ? "border-ok bg-ok-soft/50" : mine ? "border-bad bg-bad-soft/50" : "border-line"}`}>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">{l}</span>
                    <div className="min-w-0 flex-1">
                      <p className="lsat-text text-[15px]">{question.choices?.[l]}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {isKey && <Badge tone="ok">Correct</Badge>}
                        {mine && !isKey && <Badge tone="bad">Your pick</Badge>}
                        {!isKey && trap && <Badge tone="neutral">{TRAP_LABELS[trap] ?? trap}</Badge>}
                      </div>
                      <p className="mt-1 text-ink-2">{question.explanations?.[l]}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {question.keyTakeaway && (
            <p className="mt-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
              <span className="font-semibold">Takeaway: </span>
              {question.keyTakeaway}
            </p>
          )}
        </Card>
        <ReviewForm
          attemptId={attempt.id}
          initial={{
            errorType: miss?.errorType ?? null,
            errorSuggested: miss?.errorSuggested ?? null,
            trapSubtype: miss?.trapSubtype ?? null,
            whyChose: miss?.whyChose ?? "",
            whyRejectedRight: miss?.whyRejectedRight ?? "",
            howPredict: miss?.howPredict ?? "",
            killingWords: miss?.killingWords ?? "",
            avoidNextTime: miss?.avoidNextTime ?? "",
            takeaway: miss?.takeaway ?? "",
            reviewed: miss?.reviewed ?? false,
            srsBox: miss?.srsBox ?? 1,
            nextDue: miss?.nextDue ?? null,
          }}
          context={{
            correct: attempt.correct,
            guessFlag: attempt.guessFlag,
            seconds: attempt.seconds ?? 0,
            confidence: attempt.confidence,
            changedFrom: attempt.changedFrom,
            myTrap: attempt.answer && !attempt.correct ? ((question.trapPatterns?.[attempt.answer] as string | undefined) ?? null) : null,
          }}
        />
      </div>
    </div>
  );
}
