import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttemptDetail } from "@/lib/data/attempts";
import { Badge, Card } from "@/components/ui/primitives";
import { typeLabel } from "@/lib/content/labels";
import { ExplainedChoices, PassageBlock } from "@/components/review/explained-question";
import { ReviewForm } from "@/components/review/review-form";
import { TutorPanel } from "@/components/tutor/tutor-panel";
import { Button } from "@/components/ui/button";
import { LAWHUB_URL } from "@/lib/planner/official-track";
import { saveGist } from "../actions";

export const dynamic = "force-dynamic";

export default async function ReviewDetail({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const d = await getAttemptDetail(attemptId);
  if (!d) notFound();
  const { attempt, question, miss, passage } = d;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/review" className="text-ink-3 hover:text-ink">
          ← Review Inbox
        </Link>
        {attempt.sessionId && (
          <Link href={`/review/session/${attempt.sessionId}#q-${question.id}`} className="font-medium text-accent hover:underline">
            Every question from this session →
          </Link>
        )}
      </div>
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
          {question.source === "official_ref" && (
            <div className="mb-4 rounded-md border border-line bg-bg-sunken p-3 text-sm" data-testid="official-ref">
              <p className="font-medium">
                Official question · PrepTest {question.pt} · Section {question.sectionNumber} · #{question.number}
              </p>
              <p className="mt-1 text-xs text-ink-2">
                LSAC&apos;s text isn&apos;t stored here. Open it in{" "}
                <a href={LAWHUB_URL} target="_blank" rel="noreferrer" className="text-accent underline">
                  LawHub
                </a>
                , then write your own one-line gist below — what the argument did and why the right answer wins. The tutor and spaced re-drill use your gist.
              </p>
              <form action={saveGist} className="mt-2 flex items-end gap-2">
                <input type="hidden" name="questionId" value={question.id} />
                <input type="hidden" name="attemptId" value={attempt.id} />
                <textarea name="gist" aria-label="Your gist of this question" defaultValue={question.gist ?? ""} rows={2} placeholder="e.g. Causal flaw: study links X to Y, conclusion assumes no reverse cause; (C) names the reversal." className="focus-ring flex-1 rounded-md border border-line bg-bg-elev p-2 text-sm" />
                <Button type="submit" variant="outline" size="sm">
                  Save gist
                </Button>
              </form>
            </div>
          )}
          {passage && (
            <div className="mb-4">
              <PassageBlock passage={passage} />
            </div>
          )}
          {question.stimulus && <p className="lsat-text whitespace-pre-line">{question.stimulus}</p>}
          <p className="lsat-text mt-4 font-medium">{question.stem}</p>
          <ExplainedChoices question={question} picked={attempt.answer} brPicked={attempt.brAnswer} />
          <div className="mt-4">
            <TutorPanel questionId={question.id} attemptId={attempt.id} outcome={attempt.correct ? "correct" : "missed"} official={question.source === "official_ref"} />
          </div>
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
