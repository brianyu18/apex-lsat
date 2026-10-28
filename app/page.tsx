import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { BookOpen, Inbox, Target, Flame, Timer } from "lucide-react";
import { dashboardData, daysToTest } from "@/lib/data/dashboard";
import { getLessonsWithProgress } from "@/lib/data/lessons";
import { currentBottlenecks } from "@/lib/data/bottleneck";
import { studyQualityNow } from "@/lib/data/analytics";
import { qualityBand } from "@/lib/scoring/quality";
import { QualityRing } from "@/components/analytics/charts";
import { typeLabel } from "@/lib/content/labels";
import { LOGIC_TAG_LABELS, type LogicTag } from "@/lib/content/taxonomy";
import { PHASE_LABELS, type Phase } from "@/lib/planner/generate";
import { Badge, Card, CardTitle, Progress } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const d = await dashboardData();
  if (!d.settings.onboarded) redirect("/onboarding");
  const { lessons } = await getLessonsWithProgress();
  const [bottlenecks, quality] = await Promise.all([currentBottlenecks(), studyQualityNow()]);
  const qBand = qualityBand(quality.total);
  const weakest = [...quality.parts].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const nextLesson = lessons.find((l) => l.progress?.status !== "complete");
  const left = daysToTest(d.settings.testDate);
  const lr = d.sectionSkills.LR;
  const rc = d.sectionSkills.RC;
  const accPct = d.acc.n ? Math.round((d.acc.correct / d.acc.n) * 100) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {left != null ? `${left} days to test day` : "Provisional plan"}
            {d.settings.testDate && <span className="ml-2 text-base font-normal text-ink-3">{format(parseISO(d.settings.testDate), "MMM d, yyyy")}</span>}
          </h1>
          <p className="mt-1 text-ink-2">
            Goal {d.settings.goalScore} · {d.today ? PHASE_LABELS[d.today.phase as Phase] : "No plan for today"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={d.streak.studiedToday ? "ok" : "neutral"}>
            <Flame className="mr-1 h-3 w-3" /> {d.streak.dayStreak}-day streak
          </Badge>
          <Badge tone="neutral">
            {d.streak.thisWeek}/{d.settings.daysPerWeek} days this week
          </Badge>
        </div>
      </header>

      {bottlenecks.length > 0 && (
        <Card className="border-warn" data-testid="bottleneck-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Bottleneck: {bottlenecks[0].dimension === "type" ? typeLabel(bottlenecks[0].key) : LOGIC_TAG_LABELS[bottlenecks[0].key as LogicTag]}</CardTitle>
              <p className="mt-1 text-sm text-ink-2">
                {Math.round(bottlenecks[0].share * 100)}% of your counted misses in the last two weeks ({bottlenecks[0].misses}). Drill it untimed until you&apos;re above 85% over 20 —{" "}
                {bottlenecks[0].rollingN ? `currently ${Math.round((bottlenecks[0].rollingAccuracy ?? 0) * 100)}% over the last ${bottlenecks[0].rollingN}.` : "no counted attempts yet."}
              </p>
            </div>
            <Button asChild>
              <Link
                href={`/drill/session?s=${encodeURIComponent(
                  JSON.stringify(
                    bottlenecks[0].dimension === "type"
                      ? { types: [bottlenecks[0].key], count: 10, sources: ["bank", "due", "inbox"] }
                      : { tags: [bottlenecks[0].key], count: 10, sources: ["bank", "due", "inbox"] },
                  ),
                )}`}
              >
                Focus block
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Big actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Action href="/drill" icon={<Target className="h-5 w-5" />} title="Drill" desc="One question at a time, around your level." primary />
        <Action href={nextLesson ? `/learn/${nextLesson.id}` : "/learn"} icon={<BookOpen className="h-5 w-5" />} title={nextLesson ? `Learn · ${nextLesson.title}` : "Learn"} desc={nextLesson ? `U${nextLesson.unit} · ${nextLesson.minutes} min` : "All lessons complete"} />
        <Action href="/review" icon={<Inbox className="h-5 w-5" />} title={`Review · ${d.counts.inbox}`} desc={d.counts.due ? `${d.counts.due} due to re-drill` : "Tag misses, write takeaways."} badge={d.counts.inbox > 0 ? "warn" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Today */}
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <CardTitle>Today&apos;s plan</CardTitle>
            {d.today && d.today.minutes > 0 && <Badge tone="accent">{d.today.minutes} min</Badge>}
          </div>
          {d.today ? (
            <ul className="mt-3 divide-y divide-line">
              {d.today.blocks.map((b, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <BlockIcon kind={b.kind} />
                    {b.label}
                  </span>
                  <span className="tabular-nums text-ink-3">{b.minutes ? `${b.minutes}m` : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-2">Today isn&apos;t on your plan. Set up or re-plan from the Plan page.</p>
          )}
          <div className="mt-3 text-right">
            <Link href="/plan" className="text-sm text-accent hover:underline">
              Full plan →
            </Link>
          </div>
        </Card>

        {/* Skills */}
        <Card>
          <CardTitle>Skill ratings</CardTitle>
          <div className="mt-3 space-y-3">
            <SkillBar label="Logical Reasoning" pct={lr?.pct ?? 50} level={lr?.level ?? 1} n={lr?.n ?? 0} />
            <SkillBar label="Reading Comprehension" pct={rc?.pct ?? 50} level={rc?.level ?? 1} n={rc?.n ?? 0} />
          </div>
          <p className="mt-3 text-xs text-ink-3">90 ≈ acing the section. Guesses don&apos;t count. Ratings move fast at first, then settle.</p>
          {accPct != null && (
            <p className="mt-2 text-sm text-ink-2">
              Last 14 days: <span className="font-medium text-ink">{accPct}%</span> on {d.acc.n} counted questions
            </p>
          )}
          <Link href="/analytics" className="mt-4 flex items-center gap-3 rounded-md border border-line p-3 hover:border-line-strong" data-testid="quality-card">
            <QualityRing total={quality.total} size={56} />
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-wider text-ink-3">Study quality · 30 days</span>
              <span className="block text-sm font-semibold">{qBand.label}</span>
              <span className="block truncate text-xs text-ink-2">{weakest ? `Lowest: ${weakest.label.toLowerCase()} ${weakest.points}/${weakest.max}` : ""}</span>
            </span>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Weakest types</CardTitle>
          {d.typeSkills.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">Drill a few questions and your per-type ratings will show here, weakest first.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.typeSkills.slice(0, 6).map((t) => (
                <li key={t.key} className="flex items-center gap-3 text-sm">
                  <span className="w-40 truncate">{t.label}</span>
                  <Progress value={t.pct} tone={t.pct < 45 ? "bad" : t.pct < 65 ? "warn" : "ok"} className="flex-1" />
                  <span className="w-10 text-right tabular-nums text-ink-3">{t.pct}</span>
                  <span className="w-14 text-right text-xs text-ink-3">~{t.freq.toFixed(1)}/sec</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>Progress</CardTitle>
          <div className="mt-3 space-y-3 text-sm">
            <Row label="Lessons complete" value={`${d.lessonsDone} / ${lessons.length}`} />
            <Row label="Study days (90d)" value={String(d.daysActive.length)} />
            <Row label="Weeks at goal in a row" value={String(d.streak.weeks)} />
            <Row label="Questions (14d)" value={String(d.acc.total)} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/test">
                <Timer className="h-4 w-4" /> Timed section
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/analytics">Analytics</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Action({ href, icon, title, desc, primary, badge }: { href: string; icon: React.ReactNode; title: string; desc: string; primary?: boolean; badge?: "warn" }) {
  return (
    <Link href={href} className={`card focus-ring flex items-start gap-3 p-4 transition-colors hover:border-line-strong ${primary ? "border-accent" : ""} ${badge === "warn" ? "border-warn" : ""}`}>
      <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${primary ? "bg-accent text-accent-ink" : "bg-bg-sunken text-ink-2"}`}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-2">{desc}</span>
      </span>
    </Link>
  );
}

function SkillBar({ label, pct, level, n }: { label: string; pct: number; level: number; n: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-ink-2">
          {pct} · L{level}
          {n ? "" : " · unrated"}
        </span>
      </div>
      <Progress value={pct} tone={pct >= 85 ? "ok" : pct >= 60 ? "accent" : "warn"} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function BlockIcon({ kind }: { kind: string }) {
  const cls = "h-2 w-2 rounded-full";
  const color = kind === "lesson" ? "bg-info" : kind === "drill" || kind === "light" ? "bg-accent" : kind === "review" || kind === "br" ? "bg-warn" : kind === "timed_section" || kind === "pt" ? "bg-ok" : "bg-ink-3";
  return <span className={`${cls} ${color}`} aria-hidden />;
}

