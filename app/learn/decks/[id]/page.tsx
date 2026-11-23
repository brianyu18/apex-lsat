import Link from "next/link";
import { notFound } from "next/navigation";
import { DeckPlayer } from "@/components/decks/deck-player";
import { Badge } from "@/components/ui/primitives";
import { drillHref, getDeck, getPractice } from "@/lib/data/decks";
import { readLessons } from "@/lib/content/load";
import { LR_TYPE_INFO, RC_QTYPE_INFO } from "@/lib/content/taxonomy";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getDeck(id);
  return { title: d ? d.deck.title : "Strategy deck" };
}

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getDeck(id);
  if (!found) notFound();
  const { deck, prev, next } = found;
  const practiceSlide = deck.slides.find((s) => s.kind === "practice");
  const practice = practiceSlide && practiceSlide.kind === "practice" ? await getPractice(deck, practiceSlide.count) : [];
  const info: Record<string, { label: string }> = deck.section === "RC" ? RC_QTYPE_INFO : LR_TYPE_INFO;
  const typeLabels = Object.fromEntries(deck.types.map((t) => [t, info[t]?.label ?? t]));
  const { lessons } = await readLessons();
  const related = deck.lessonIds.map((lid) => lessons.find((l) => l.id === lid)).filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <article className="mx-auto max-w-5xl">
      <nav className="mb-5 flex items-center justify-between text-sm">
        <Link href="/learn/decks" className="text-ink-3 hover:text-ink">
          ← Strategy decks
        </Link>
        <span className="text-ink-3">{deck.minutes} min</span>
      </nav>
      <header className="mb-5">
        <h1 className="text-3xl font-semibold tracking-tight">{deck.title}</h1>
        <p className="mt-2 max-w-3xl text-ink-2">{deck.summary}</p>
        {deck.types.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {deck.types.map((t) => (
              <Badge key={t} tone="neutral">
                {typeLabels[t]}
              </Badge>
            ))}
          </div>
        )}
      </header>

      <DeckPlayer deck={deck} practice={practice} drillHref={drillHref(deck)} typeLabels={typeLabels} />

      <footer className="mt-8 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          {related.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Go deeper in the curriculum</p>
              <ul className="mt-2 space-y-1 text-sm">
                {related.map((l) => (
                  <li key={l.id}>
                    <Link href={`/learn/${l.id}`} className="text-accent hover:underline">
                      U{l.unit} · {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="flex items-start justify-end gap-4 text-sm">
          {prev && (
            <Link href={`/learn/decks/${prev.id}`} className="text-ink-2 hover:text-ink">
              ← {prev.title}
            </Link>
          )}
          {next && (
            <Link href={`/learn/decks/${next.id}`} className="text-ink-2 hover:text-ink">
              {next.title} →
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
