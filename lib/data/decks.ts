import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { readDecks } from "@/lib/decks/load";
import type { Deck } from "@/lib/decks/schema";

export interface PracticeQuestion {
  id: string;
  type: string;
  difficulty: number;
  stimulus: string | null;
  stem: string;
  choices: Record<string, string>;
  answer: string;
  explanations: Record<string, string> | null;
  passage: { title: string; paragraphs: string[]; paragraphsB: string[] | null } | null;
}

export async function getDeck(id: string) {
  const { decks } = await readDecks();
  const i = decks.findIndex((d) => d.id === id);
  if (i === -1) return null;
  return { deck: decks[i], prev: decks[i - 1] ?? null, next: decks[i + 1] ?? null };
}

/**
 * Practice questions for a deck: bank questions of the deck's types at
 * difficulty 2–3 (1–4 if there are too few), spread across the types and
 * stable from one visit to the next.
 */
export async function getPractice(deck: Deck, count: number): Promise<PracticeQuestion[]> {
  if (!deck.types.length || count < 1) return [];
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.questions)
    .where(and(eq(schema.questions.section, deck.section), eq(schema.questions.source, "original"), inArray(schema.questions.type, deck.types), isNotNull(schema.questions.answer)));
  const usable = rows.filter((q) => q.stem && q.choices && q.answer).sort((a, b) => a.id.localeCompare(b.id));
  const mid = usable.filter((q) => q.difficulty === 2 || q.difficulty === 3);
  const pool = mid.length >= count ? mid : usable;
  // round-robin across types so a multi-type deck practises each, then take evenly spaced items within a type
  const byType = deck.types.map((t) => pool.filter((q) => q.type === t)).filter((l) => l.length);
  const picked: typeof pool = [];
  for (let k = 0; picked.length < count && byType.some((l) => l.length > k); k++) {
    for (const l of byType) {
      if (picked.length >= count) break;
      const step = Math.max(1, Math.floor(l.length / (count + 1)));
      const q = l[(k + 1) * step] ?? l[k];
      if (q && !picked.includes(q)) picked.push(q);
    }
  }
  const pids = [...new Set(picked.map((q) => q.passageId).filter((x): x is string => Boolean(x)))];
  const passages = pids.length ? await db.select().from(schema.passages).where(inArray(schema.passages.id, pids)) : [];
  const pmap = new Map(passages.map((p) => [p.id, p]));
  return picked.map((q) => {
    const p = q.passageId ? pmap.get(q.passageId) : null;
    return {
      id: q.id,
      type: q.type,
      difficulty: q.difficulty,
      stimulus: q.stimulus,
      stem: q.stem!,
      choices: q.choices!,
      answer: q.answer!,
      explanations: q.explanations,
      passage: p ? { title: p.title ?? "Passage", paragraphs: p.paragraphs ?? [], paragraphsB: p.paragraphsB ?? null } : null,
    };
  });
}

/** Drill link for a deck's question types, in the shape the drill pages read. */
export function drillHref(deck: Deck): string | null {
  if (!deck.types.length) return null;
  if (deck.section === "RC") return `/drill/rc?s=${encodeURIComponent(JSON.stringify({ passages: 1, predictionMode: false, qtypes: deck.types }))}`;
  const s = { section: "LR", types: deck.types, tags: null, levels: null, randomDifficultyPct: 10, repeat: true, sources: ["due", "inbox", "bank"], predictionMode: false, count: 10 };
  return `/drill/session?s=${encodeURIComponent(JSON.stringify(s))}`;
}
