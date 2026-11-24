/**
 * ExplainedChoices — the five answer choices with the written explanation
 * under each, the key marked and the student's own pick marked. Every bank
 * question carries an explanation for all five choices; uploaded tests may
 * not, and say so here instead of showing a blank line.
 */
import { Badge } from "@/components/ui/primitives";
import { TRAP_LABELS, type TrapPattern } from "@/lib/content/taxonomy";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export type ExplainedQuestion = {
  answer: string | null;
  choices: Record<string, string> | null;
  explanations: Partial<Record<string, string>> | null;
  trapPatterns?: Partial<Record<string, string>> | null;
  keyTakeaway?: string | null;
};

export function hasExplanation(q: Pick<ExplainedQuestion, "explanations">) {
  return LETTERS.some((l) => q.explanations?.[l]?.trim());
}

export function ExplainedChoices({ question, picked, brPicked }: { question: ExplainedQuestion; picked: string | null; brPicked?: string | null }) {
  const key = question.answer;
  const any = hasExplanation(question);
  return (
    <>
      {!any && (
        <p className="mt-3 rounded-md bg-bg-sunken px-3 py-2 text-sm text-ink-2" data-testid="no-explanation">
          No written explanation was supplied with this question (it came from an uploaded test). Add an <code>explanations</code> entry for it in the test file and upload again, or ask the tutor.
        </p>
      )}
      <ol className="mt-3 space-y-2">
        {LETTERS.map((l) => {
          if (!question.choices?.[l]) return null;
          const isKey = key === l;
          const mine = picked === l;
          const trap = question.trapPatterns?.[l] as TrapPattern | undefined;
          const text = question.explanations?.[l]?.trim();
          return (
            <li key={l} className={`rounded-md border px-3 py-2 text-sm ${isKey ? "border-ok bg-ok-soft/50" : mine ? "border-bad bg-bad-soft/50" : "border-line"}`}>
              <div className="flex items-start gap-2">
                <span className="font-semibold">{l}</span>
                <div className="min-w-0 flex-1">
                  <p className="lsat-text text-[15px]">{question.choices[l]}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {isKey && <Badge tone="ok">Correct</Badge>}
                    {mine && <Badge tone={isKey ? "ok" : "bad"}>Your pick</Badge>}
                    {brPicked === l && brPicked !== picked && <Badge tone="info">Your blind-review pick</Badge>}
                    {!isKey && trap && <Badge tone="neutral">{TRAP_LABELS[trap] ?? trap}</Badge>}
                  </div>
                  {text ? <p className="mt-1 text-ink-2">{text}</p> : any ? <p className="mt-1 text-ink-3">No written explanation for this choice.</p> : null}
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
    </>
  );
}

export type ReviewPassage = { title: string | null; comparative: boolean; paragraphs: string[] | null; paragraphsB: string[] | null };

/** The passage an RC question belongs to, folded away by default so the question stays in view. */
export function PassageBlock({ passage, open = false }: { passage: ReviewPassage; open?: boolean }) {
  return (
    <details className="rounded-md border border-line bg-bg-sunken p-3" open={open} data-testid="review-passage">
      <summary className="focus-ring cursor-pointer text-sm font-medium">Passage: {passage.title ?? "Reading Comprehension"}</summary>
      <div className="lsat-text mt-3 space-y-3 text-[15px]">
        {passage.comparative && <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Passage A</p>}
        {(passage.paragraphs ?? []).map((x, i) => (
          <p key={`a${i}`}>{x}</p>
        ))}
        {passage.paragraphsB?.length ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Passage B</p>
            {passage.paragraphsB.map((x, i) => (
              <p key={`b${i}`}>{x}</p>
            ))}
          </>
        ) : null}
      </div>
    </details>
  );
}
