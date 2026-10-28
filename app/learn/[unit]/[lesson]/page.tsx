import Link from "next/link";
import { notFound } from "next/navigation";
import { Mdx } from "@/components/learn/mdx";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLesson, getLessonProgress, setLessonProgress, UNIT_TITLES } from "@/lib/data/lessons";
import { Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LR_TYPES } from "@/lib/content/taxonomy";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ unit: string; lesson: string }> }) {
  const { unit, lesson } = await params;
  const id = `${unit}/${lesson}`;
  const l = await getLesson(id);
  if (!l) notFound();
  const progress = await getLessonProgress(id);
  if (!progress) await setLessonProgress(id, { status: "in_progress" });

  const types = l.checkTags.filter((t) => (LR_TYPES as readonly string[]).includes(t));
  const tags = l.checkTags.filter((t) => !(LR_TYPES as readonly string[]).includes(t));
  // Types win when present (a type filter AND a tag filter would over-narrow the bank).
  const checkSettings = {
    section: l.checkSection,
    types: types.length ? types : null,
    tags: types.length ? null : tags.length ? tags : null,
    levels: null,
    randomDifficultyPct: 10,
    repeat: true,
    sources: ["bank"],
    predictionMode: false,
    count: 5,
  };
  const rcStyles = ["critique_debate", "single_position", "phenomenon_hypothesis", "problem_analysis", "spotlight"];
  const rcCheck = { passages: 1, predictionMode: false, styles: l.checkTags.filter((t) => rcStyles.includes(t)), qtypes: l.checkTags.filter((t) => !rcStyles.includes(t)) };
  if (!rcCheck.styles.length) delete (rcCheck as { styles?: string[] }).styles;
  if (!rcCheck.qtypes.length) delete (rcCheck as { qtypes?: string[] }).qtypes;
  const checkHref =
    l.checkMode === "writing"
      ? `/test/writing?lesson=${encodeURIComponent(id)}`
      : l.checkMode === "timed"
        ? `/test/section?lesson=${encodeURIComponent(id)}&n=10&min=14`
        : l.checkSection === "RC"
          ? `/drill/rc?lesson=${encodeURIComponent(id)}&s=${encodeURIComponent(JSON.stringify(rcCheck))}`
          : `/drill/session?lesson=${encodeURIComponent(id)}&s=${encodeURIComponent(JSON.stringify(checkSettings))}`;
  const checkCopy =
    l.checkMode === "writing"
      ? { title: "Check: a timed essay", body: "A full Argumentative Writing prompt: 15 minutes to prewrite, 35 to write. Saving the essay marks the lesson complete; your outline and timings are kept for review." }
      : l.checkMode === "timed"
        ? { title: "Check: a 10-question timed set", body: "Ten mixed LR questions in 14 minutes, in the LawHub interface, with blind review after. Score 7 of 10 timed to mark the lesson complete." }
        : l.checkSection === "RC"
          ? { title: "Check: one passage", body: "A full passage set from the bank matching this lesson, untimed. Get 80% to mark the lesson complete; misses go to your Review Inbox." }
          : { title: "Check: five questions", body: "Drawn from the bank by this lesson’s tags, untimed. Get 4 of 5 to mark the lesson complete; misses go to your Review Inbox." };

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-6 flex items-center justify-between text-sm">
        <Link href="/learn" className="text-ink-3 hover:text-ink">
          ← Curriculum
        </Link>
        <span className="text-ink-3">
          U{l.unit} · {UNIT_TITLES[l.unit]?.title} · lesson {l.order}
        </span>
      </nav>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{l.title}</h1>
        <p className="mt-2 text-ink-2">{l.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="neutral">{l.minutes} min</Badge>
          {progress?.status === "complete" && <Badge tone="ok">Complete · {progress.checkScore}/{progress.checkTotal}</Badge>}
          {progress?.status !== "complete" && progress?.checkScore != null && <Badge tone="warn">Last check {progress.checkScore}/{progress.checkTotal} — need 4</Badge>}
        </div>
      </header>

      <div className="text-[16px]">
        <Mdx source={l.body} />
      </div>

      <Card className="mt-10 border-accent">
        <h2 className="text-lg font-semibold">{checkCopy.title}</h2>
        <p className="mt-1 text-sm text-ink-2">{checkCopy.body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={checkHref}>Start the check</Link>
          </Button>
          {l.next && (
            <Button asChild variant="ghost">
              <Link href={`/learn/${l.next.id}`}>Skip to next lesson</Link>
            </Button>
          )}
        </div>
      </Card>

      <nav className="mt-8 flex items-center justify-between text-sm">
        {l.prev ? (
          <Link href={`/learn/${l.prev.id}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> {l.prev.title}
          </Link>
        ) : (
          <span />
        )}
        {l.next && (
          <Link href={`/learn/${l.next.id}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            {l.next.title} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </article>
  );
}
