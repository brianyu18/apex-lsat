import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge, Card } from "@/components/ui/primitives";
import { ExplainedChoices, PassageBlock } from "@/components/review/explained-question";
import { getSessionReview } from "@/lib/data/session-review";
import { typeLabel } from "@/lib/content/labels";

export const metadata = { title: "Review every question" };
export const dynamic = "force-dynamic";

const FILTERS = [
  ["all", "All"],
  ["missed", "Missed or blank"],
  ["right", "Right"],
  ["flagged", "Flagged or guessed"],
] as const;
type Show = (typeof FILTERS)[number][0];

export default async function SessionReviewPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<{ show?: string }> }) {
  const { sessionId } = await params;
  const { show: raw } = await searchParams;
  const show: Show = FILTERS.some(([k]) => k === raw) ? (raw as Show) : "all";
  const d = await getSessionReview(sessionId);
  if (!d) notFound();
  const { session, items, passages, sections } = d;

  const match = (it: (typeof items)[number], f: Show) =>
    f === "all" ? true : f === "missed" ? !it.attempt.correct : f === "right" ? !!it.attempt.correct : it.attempt.flagged || it.attempt.guessFlag;
  const count = (f: Show) => items.filter((it) => match(it, f)).length;
  const shown = items.filter((it) => match(it, show));
  const right = count("right");
  const multi = sections.length > 1;
  // question number within its section
  const numberOf = new Map<string, number>();
  const perSection = new Map<number, number>();
  for (const it of items) {
    const n = (perSection.get(it.sectionIndex) ?? 0) + 1;
    perSection.set(it.sectionIndex, n);
    numberOf.set(it.question.id, n);
  }

  let lastSection = -1;
  let lastPassage: string | null = null;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <Link href="/review" className="text-sm text-ink-3 hover:text-ink">
          ← Review
        </Link>
        <p className="mt-3 text-sm font-medium uppercase tracking-wider text-accent">Review every question</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{d.label}</h1>
        <p className="mt-1 text-ink-2">
          {format(session.startedAt, "MMM d, yyyy · h:mm a")} · {right} of {items.length} right
          {session.scoreScaled != null ? ` · about ${session.scoreScaled} scaled` : ""}. Every question is here with the written reason each choice is right or wrong, including the ones you got right.
        </p>
        <nav aria-label="Filter questions" className="mt-4 flex flex-wrap gap-2" data-testid="session-review-filters">
          {FILTERS.map(([k, label]) => (
            <Link
              key={k}
              href={k === "all" ? `/review/session/${sessionId}` : `/review/session/${sessionId}?show=${k}`}
              aria-current={k === show ? "true" : undefined}
              className={`focus-ring rounded-full border px-3 py-1 text-sm ${k === show ? "border-accent bg-accent-soft font-medium" : "border-line text-ink-2 hover:border-line-strong"}`}
            >
              {label} · {count(k)}
            </Link>
          ))}
        </nav>
      </header>

      {shown.length === 0 && (
        <Card>
          <p className="text-sm text-ink-2">{items.length === 0 ? "No answers were recorded in this session." : "Nothing in this filter."}</p>
        </Card>
      )}

      <ol className="space-y-5" data-testid="session-review">
        {shown.map((it) => {
          const { attempt, question } = it;
          const newSection = multi && it.sectionIndex !== lastSection;
          lastSection = it.sectionIndex;
          const passage = question.passageId ? passages.get(question.passageId) : undefined;
          const newPassage = !!passage && question.passageId !== lastPassage;
          lastPassage = question.passageId ?? null;
          const spec = sections.find((s) => s.index === it.sectionIndex);
          return (
            <li key={attempt.id} className="space-y-3">
              {newSection && (
                <h2 className="border-b border-line pb-1 pt-3 text-lg font-semibold">
                  Section {it.sectionIndex + 1} · {spec?.kind === "RC" ? "Reading Comprehension" : "Logical Reasoning"}
                  {spec && !spec.scored ? <span className="ml-2 text-sm font-normal text-ink-3">unscored</span> : null}
                </h2>
              )}
              {passage && newPassage && <PassageBlock passage={passage} />}
              <Card id={`q-${question.id}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-sm font-semibold">Question {numberOf.get(question.id)}</span>
                  <Badge>{typeLabel(question.type)}</Badge>
                  <Badge tone="neutral">L{question.difficulty}</Badge>
                  {attempt.answer == null ? <Badge tone="warn">Left blank</Badge> : attempt.correct ? <Badge tone="ok">Right</Badge> : <Badge tone="bad">Missed · you chose {attempt.answer}</Badge>}
                  {attempt.brAnswer && attempt.brAnswer !== attempt.answer && <Badge tone="info">Blind review: {attempt.brAnswer}</Badge>}
                  {attempt.flagged && <Badge tone="accent">Flagged</Badge>}
                  {attempt.guessFlag && <Badge tone="warn">Guess</Badge>}
                  {it.unscored && <Badge tone="neutral">Unscored</Badge>}
                  <span className="text-ink-3">{Math.round(attempt.seconds ?? 0)}s</span>
                </div>
                {passage && !newPassage && <p className="mb-2 text-xs text-ink-3">Passage: {passage.title ?? "above"}</p>}
                {question.stimulus && <p className="lsat-text whitespace-pre-line">{question.stimulus}</p>}
                <p className="lsat-text mt-3 font-medium">{question.stem}</p>
                <ExplainedChoices question={question} picked={attempt.answer} brPicked={attempt.brAnswer} />
                <p className="mt-3 text-sm">
                  <Link href={`/review/${attempt.id}`} className="font-medium text-accent hover:underline">
                    Open this question: journal and tutor →
                  </Link>
                </p>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
