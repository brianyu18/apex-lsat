import Link from "next/link";
import { DeckProgress } from "@/components/decks/deck-progress";
import { Badge, Card } from "@/components/ui/primitives";
import { readDecks } from "@/lib/decks/load";
import { DECK_GROUPS } from "@/lib/decks/schema";

export const metadata = { title: "Strategy decks" };
export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const { decks } = await readDecks();
  const groups = (Object.keys(DECK_GROUPS) as (keyof typeof DECK_GROUPS)[]).map((g) => ({ g, decks: decks.filter((d) => d.group === g) }));
  return (
    <div className="space-y-7">
      <header>
        <Link href="/learn" className="text-sm text-ink-3 hover:text-ink">
          ← Curriculum
        </Link>
        <p className="mt-3 text-sm font-medium uppercase tracking-wider text-accent">Learn</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Strategy decks</h1>
        <p className="mt-1 max-w-3xl text-ink-2">
          Click-through decks for every section skill and question type: how to recognise it, the method step by step, a worked example you reveal one move at a time, the traps,
          and live practice from the question bank.
        </p>
      </header>
      {groups.map(({ g, decks: ds }) => (
        <section key={g} aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="text-lg font-semibold">
            {DECK_GROUPS[g].title}
          </h2>
          <p className="mb-3 text-sm text-ink-2">{DECK_GROUPS[g].blurb}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ds.map((d) => (
              <Link key={d.id} href={`/learn/decks/${d.id}`} className="focus-ring rounded-[var(--radius)]">
                <Card className="flex h-full flex-col gap-2 p-4 hover:border-line-strong">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{d.title}</p>
                    <DeckProgress id={d.id} />
                  </div>
                  <p className="text-sm text-ink-2">{d.summary}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    <Badge tone="neutral">{d.slides.length} slides</Badge>
                    <Badge tone="neutral">{d.minutes} min</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
