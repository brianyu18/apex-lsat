import Link from "next/link";
import { Check, Circle, CircleDot } from "lucide-react";
import { getLessonsWithProgress, UNIT_TITLES } from "@/lib/data/lessons";
import { Badge, Card, Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";

export const metadata = { title: "Learn" };
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const { lessons } = await getLessonsWithProgress();
  const units = Array.from(new Set(lessons.map((l) => l.unit))).sort((a, b) => a - b);
  const done = lessons.filter((l) => l.progress?.status === "complete").length;
  const next = lessons.find((l) => l.progress?.status !== "complete");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Learn</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Curriculum</h1>
          <p className="mt-1 text-ink-2">Short lessons, each with an interactive diagram and a five-question check. Pass 4 of 5 to move on.</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex justify-between text-xs text-ink-3">
            <span>{done} / {lessons.length} complete</span>
            {next && (
              <Link href={`/learn/${next.id}`} className="text-accent hover:underline">
                Continue →
              </Link>
            )}
          </div>
          <Progress value={lessons.length ? (done / lessons.length) * 100 : 0} />
        </div>
      </header>

      {units.map((u) => {
        const ls = lessons.filter((l) => l.unit === u);
        const uDone = ls.filter((l) => l.progress?.status === "complete").length;
        return (
          <section key={u} aria-labelledby={`unit-${u}`}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id={`unit-${u}`} className="text-lg font-semibold">
                <span className="mr-2 text-ink-3">U{u}</span>
                {UNIT_TITLES[u]?.title ?? `Unit ${u}`}
              </h2>
              <Badge tone={uDone === ls.length ? "ok" : "neutral"}>
                {uDone}/{ls.length}
              </Badge>
            </div>
            <p className="mb-3 text-sm text-ink-2">{UNIT_TITLES[u]?.blurb}</p>
            <Card className="divide-y divide-line p-0">
              {ls.map((l) => {
                const st = l.progress?.status ?? "not_started";
                return (
                  <Link key={l.id} href={`/learn/${l.id}`} className="focus-ring flex items-center gap-3 px-4 py-3 hover:bg-bg-sunken">
                    {st === "complete" ? <Check className="h-4 w-4 shrink-0 text-ok" /> : st === "in_progress" ? <CircleDot className="h-4 w-4 shrink-0 text-accent" /> : <Circle className="h-4 w-4 shrink-0 text-ink-3" />}
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", st === "complete" && "text-ink-2")}>
                        {l.order}. {l.title}
                      </p>
                      <p className="truncate text-xs text-ink-3">{l.summary}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-ink-3">{l.minutes} min</span>
                    {l.progress?.checkScore != null && (
                      <Badge tone={st === "complete" ? "ok" : "warn"}>
                        {l.progress.checkScore}/{l.progress.checkTotal}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
