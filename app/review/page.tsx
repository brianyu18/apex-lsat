import Link from "next/link";
import { inboxItems, reviewCounts } from "@/lib/data/review";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/components/review/inbox-list";

export const metadata = { title: "Review" };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [open, done, counts] = await Promise.all([inboxItems({ reviewed: false }), inboxItems({ reviewed: true, limit: 50 }), reviewCounts()]);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Review</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Review Inbox</h1>
          <p className="mt-1 text-ink-2">Every miss and every lucky guess lands here. Tag why it happened, write the takeaway, and it comes back on a schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={counts.inbox ? "warn" : "ok"}>{counts.inbox} to review</Badge>
          <Badge tone={counts.due ? "accent" : "neutral"}>{counts.due} due to re-drill</Badge>
          {counts.due > 0 && (
            <Button asChild size="sm">
              <Link href={`/drill/session?s=${encodeURIComponent(JSON.stringify({ sources: ["due"], count: 0 }))}`}>Re-drill due</Link>
            </Button>
          )}
        </div>
      </header>

      {open.length === 0 ? (
        <Card>
          <CardTitle>Inbox zero</CardTitle>
          <CardDescription>Nothing waiting. Go drill — the next miss will show up here.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/drill">Drill</Link>
          </Button>
        </Card>
      ) : (
        <InboxList items={open.map(serialize)} />
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="focus-ring cursor-pointer text-sm font-medium text-ink-2">Recently reviewed · {done.length} (last 7 days)</summary>
          <div className="mt-3">
            <InboxList items={done.map(serialize)} reviewed />
          </div>
        </details>
      )}
    </div>
  );
}

function serialize(i: Awaited<ReturnType<typeof inboxItems>>[number]) {
  return {
    attemptId: i.attemptId,
    questionId: i.questionId,
    errorType: i.errorType,
    srsBox: i.srsBox,
    nextDue: i.nextDue,
    createdAt: i.createdAt.toISOString(),
    type: i.type,
    difficulty: i.difficulty,
    stem: i.stem,
    stimulus: i.stimulus,
    answer: i.answer,
    correct: i.correct,
    seconds: i.seconds,
    confidence: i.confidence,
    guessFlag: i.guessFlag,
    takeaway: i.takeaway,
  };
}
