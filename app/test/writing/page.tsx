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
      </header>
      <WritingRunner prompt={prompt} lessonId={lesson ?? null} />
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
