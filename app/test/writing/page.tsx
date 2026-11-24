import Link from "next/link";
import { format } from "date-fns";
import { WritingRunner } from "@/components/writing/writing-runner";
import { Card, CardTitle } from "@/components/ui/primitives";
import { recentWriting } from "@/lib/data/writing";
import { pickPrompt, WRITING_PROMPTS } from "@/lib/writing/prompts";

export const metadata = { title: "Argumentative Writing" };
export const dynamic = "force-dynamic";

export default async function WritingPage({ searchParams }: { searchParams: Promise<{ lesson?: string; prompt?: string }> }) {
  const { lesson, prompt: pid } = await searchParams;
  const recent = await recentWriting(8);
  const prompt = WRITING_PROMPTS.find((p) => p.id === pid) ?? pickPrompt(recent.map((r) => r.promptId));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Test</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Argumentative Writing</h1>
        <p className="mt-1 text-ink-2">The 50-minute essay under real conditions: 15 minutes to plan, 35 to write. Unscored, but every school reads it.</p>
        <Link href="/learn/writing" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
          Writing guide: strategy, structure and annotated sample essays →
        </Link>
      </header>
      {/* Keyed on the chosen prompt only: a random pick changes on refresh and must not reset a finished essay. */}
      <WritingRunner key={pid ?? "auto"} prompt={prompt} lessonId={lesson ?? null} />
      <Card>
        <CardTitle>Choose a prompt</CardTitle>
        <p className="mt-1 text-sm text-ink-2">A new prompt is picked for you each visit. To choose one yourself, pick from the {WRITING_PROMPTS.length} below; only the titles are shown, so nothing is given away.</p>
        <ul className="mt-3 flex flex-wrap gap-2" data-testid="prompt-picker">
          {WRITING_PROMPTS.map((p) => {
            const done = recent.some((r) => r.promptId === p.id);
            return (
              <li key={p.id}>
                <Link
                  href={`/test/writing?prompt=${p.id}${lesson ? `&lesson=${lesson}` : ""}`}
                  aria-current={p.id === pid ? "true" : undefined}
                  className={`focus-ring inline-block rounded-full border px-3 py-1 text-sm ${p.id === pid ? "border-accent bg-accent-soft font-medium" : "border-line hover:border-line-strong"}`}
                >
                  {p.title}
                  {done ? " · written" : p.model ? " · has sample" : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <CardTitle>Recent essays</CardTitle>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {recent.map((r) => {
              const p = WRITING_PROMPTS.find((x) => x.id === r.promptId);
              return (
                <li key={r.id} className="py-2">
                  <details>
                    <summary className="cursor-pointer">
                      {format(r.startedAt, "MMM d")} · {p?.title ?? r.promptId} · {r.words} words · plan {Math.round(r.prewriteSec / 60)} min · write {Math.round(r.writeSec / 60)} min
                    </summary>
                    <p className="lsat-text mt-2 whitespace-pre-line text-[15px] text-ink-2">{r.essay}</p>
                    <Link href="/learn/writing#rubric" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
                      Score it with the rubric →
                    </Link>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
