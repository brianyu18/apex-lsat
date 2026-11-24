import Link from "next/link";
import { EssayGallery } from "@/components/writing/annotated-essay";
import { SelfRubric, UpgradeCards } from "@/components/writing/self-rubric";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { BLUEPRINT, essayWordCount, FORMAT_FACTS, LOGISTICS, MODEL_ESSAYS, PREP_PLAN, READER_WANTS, STAND_OUT, UPGRADES } from "@/lib/writing/guide";
import { WRITING_PROMPTS } from "@/lib/writing/prompts";

export const metadata = { title: "Argumentative Writing guide" };

const SECTIONS = [
  ["format", "The format"],
  ["readers", "What readers want"],
  ["blueprint", "The blueprint"],
  ["essays", "Sample essays"],
  ["sentences", "Sentence upgrades"],
  ["prompts", "Prompts"],
  ["rubric", "Score yours"],
  ["prepare", "How to prepare"],
] as const;

export default function WritingGuidePage() {
  const essays = MODEL_ESSAYS.map((essay) => ({ essay, words: essayWordCount(essay), prompt: WRITING_PROMPTS.find((p) => p.id === essay.promptId)! }));
  const strongCount = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"][essays.filter((e) => e.essay.quality === "strong").length] ?? "Several";
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <Link href="/learn" className="text-sm text-ink-3 hover:text-ink">
          ← Curriculum
        </Link>
        <p className="mt-3 text-sm font-medium uppercase tracking-wider text-accent">Learn</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Argumentative Writing guide</h1>
        <p className="mt-1 max-w-3xl text-ink-2">
          What the essay is, what admissions readers do with it, a structure you can hit every time, {essays.length} sample essays taken apart paragraph by paragraph, {WRITING_PROMPTS.length}{" "}
          practice prompts, and a plan to get ready.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/test/writing">Write a timed essay</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/learn/u6/the-task">Unit 6 lessons</Link>
          </Button>
        </div>
        <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="focus-ring rounded-full border border-line px-3 py-1 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section id="format" aria-labelledby="h-format" className="scroll-mt-6 space-y-4">
        <h2 id="h-format" className="text-xl font-semibold">
          The format
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FORMAT_FACTS.map((f) => (
            <Card key={f.label} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{f.label}</p>
              <p className="mt-1 text-lg font-semibold">{f.value}</p>
              <p className="mt-1 text-sm text-ink-2">{f.note}</p>
            </Card>
          ))}
        </div>
        <Card>
          <CardTitle>Practical details</CardTitle>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px]">
            {LOGISTICS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">
            Format details follow LSAC&apos;s published description and can change. Confirm them on{" "}
            <a href="https://www.lsac.org/lsat/about/lsat-argumentative-writing" className="underline" target="_blank" rel="noreferrer">
              lsac.org
            </a>{" "}
            before your test.
          </p>
        </Card>
      </section>

      <section id="readers" aria-labelledby="h-readers" className="scroll-mt-6 space-y-4">
        <h2 id="h-readers" className="text-xl font-semibold">
          What admissions readers want
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">
          The essay has no score, so there is no number to maximize. Admissions readers usually give it a short read, and a brilliant essay will not make up for a weak LSAT score. What it can
          do is confirm that you write clearly on your own, or raise a doubt that you do. Aim for an essay that is easy to read and plainly competent; that already puts it ahead of most.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {READER_WANTS.map((r) => (
            <Card key={r.title} className="p-4">
              <p className="font-semibold">{r.title}</p>
              <p className="mt-1 text-sm text-ink-2">{r.body}</p>
            </Card>
          ))}
        </div>
        <h3 className="pt-2 text-lg font-semibold">Six things that make an essay stand out</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAND_OUT.map((s, k) => (
            <div key={s.title} className="rounded-md border border-line p-4">
              <p className="font-semibold">
                <span className="mr-2 text-accent">{k + 1}</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="blueprint" aria-labelledby="h-blueprint" className="scroll-mt-6 space-y-4">
        <h2 id="h-blueprint" className="text-xl font-semibold">
          The five-paragraph blueprint
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">
          Decide the shape before the clock starts, so the 35 minutes go to the argument. The clock column shows what the writing timer should read when each part is done.
        </p>
        <ol className="space-y-2" data-testid="blueprint">
          {BLUEPRINT.map((b, k) => (
            <li key={b.part} className="grid gap-x-4 gap-y-1 rounded-md border border-line p-3 sm:grid-cols-[150px_90px_1fr]">
              <p className="font-semibold">
                <span className="mr-2 text-accent">{k + 1}</span>
                {b.part}
              </p>
              <p className="text-sm tabular-nums text-ink-2">
                {b.minutes} min · {b.clock}
              </p>
              <div>
                <p className="text-[15px]">{b.job}</p>
                {b.opener && <p className="lsat-text mt-1 text-sm text-ink-3">{b.opener}</p>}
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-ink-2">
          The 15 minutes before this are covered step by step in{" "}
          <Link href="/learn/u6/prewriting" className="text-accent hover:underline">
            The 15 minutes
          </Link>
          : read, rank the perspectives, commit, write the thesis, find two supported reasons, choose the objection.
        </p>
      </section>

      <section id="essays" aria-labelledby="h-essays" className="scroll-mt-6 space-y-4">
        <h2 id="h-essays" className="text-xl font-semibold">
          Sample essays, taken apart
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">
          {strongCount} strong essays, each built a different way, plus a competent one and a weak one for contrast. Click a paragraph to see what it is doing and which phrases do the work. The
          strong essays are written to the standard of a careful 35 minutes, not a polished draft.
        </p>
        <Card>
          <EssayGallery essays={essays} />
        </Card>
      </section>

      <section id="sentences" aria-labelledby="h-sentences" className="scroll-mt-6 space-y-4">
        <h2 id="h-sentences" className="text-xl font-semibold">
          Sentence upgrades
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">Each card shows a weak version of one move, all on the juror-pay prompt. Click it to see the stronger version and what changed.</p>
        <UpgradeCards items={UPGRADES} />
      </section>

      <section id="prompts" aria-labelledby="h-prompts" className="scroll-mt-6 space-y-4">
        <h2 id="h-prompts" className="text-xl font-semibold">
          Practice prompts
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">
          {WRITING_PROMPTS.length} original prompts in the test&apos;s format. Opening one here shows only its question; the context and perspectives appear when the prewriting clock starts, as
          on test day.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="prompt-library">
          {WRITING_PROMPTS.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-md border border-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{p.area}</Badge>
                {p.model && <Badge tone="info">Has a sample essay</Badge>}
                <Badge tone="neutral">{p.perspectives.length} perspectives</Badge>
              </div>
              <p className="font-semibold">{p.title}</p>
              <p className="lsat-text text-[15px] text-ink-2">{p.issue}</p>
              <Link href={`/test/writing?prompt=${p.id}`} className="mt-auto text-sm font-medium text-accent hover:underline">
                Write on this prompt →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="rubric" aria-labelledby="h-rubric" className="scroll-mt-6 space-y-4">
        <h2 id="h-rubric" className="text-xl font-semibold">
          Score your own essay
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">
          Reread a saved essay the day after you wrote it (they are under Recent essays on the{" "}
          <Link href="/test/writing" className="text-accent hover:underline">
            practice page
          </Link>
          ) and pick a level in each row.
        </p>
        <SelfRubric />
      </section>

      <section id="prepare" aria-labelledby="h-prepare" className="scroll-mt-6 space-y-4">
        <h2 id="h-prepare" className="text-xl font-semibold">
          How to prepare
        </h2>
        <p className="max-w-3xl text-[15px] text-ink-2">About five hours in total, spread over three or four weeks. The essay rewards a routine more than talent, and it should not take time from the scored sections.</p>
        <ol className="space-y-2">
          {PREP_PLAN.map((s, k) => (
            <li key={s.step} className="flex gap-3 rounded-md border border-line p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">{k + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {s.step} <span className="ml-1 text-sm font-normal text-ink-3">{s.time}</span>
                </p>
                <p className="text-[15px] text-ink-2">{s.what}</p>
                {s.href && (
                  <Link href={s.href} className="text-sm font-medium text-accent hover:underline">
                    {s.cta} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
        <Card className="border-accent">
          <CardTitle>Ready?</CardTitle>
          <CardDescription>Both clocks, a prompt you have not seen, and the outline beside you as you write.</CardDescription>
          <Button asChild className="mt-3">
            <Link href="/test/writing">Write a timed essay</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
