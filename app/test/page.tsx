import Link from "next/link";
import { format } from "date-fns";
import { Timer, FileText, Upload } from "lucide-react";
import { recentSections } from "@/lib/data/sections";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Test" };
export const dynamic = "force-dynamic";

export default async function TestPage() {
  const recent = await recentSections(8);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Test</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Timed practice</h1>
        <p className="mt-1 text-ink-2">Sections and full tests under real conditions, with blind review built in. Go timed once your untimed accuracy on a type is reliably above 85%.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/test/section" className="card focus-ring flex items-start gap-3 border-accent p-4 hover:border-line-strong">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink"><Timer className="h-5 w-5" /></span>
          <span><span className="block font-semibold">Timed LR section</span><span className="block text-sm text-ink-2">25 questions · 35 min · blind review after</span></span>
        </Link>
        <div className="card flex items-start gap-3 p-4 opacity-60">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-ink-2"><FileText className="h-5 w-5" /></span>
          <span><span className="block font-semibold">Full practice test</span><span className="block text-sm text-ink-2">Phase 3 — 4 sections + break, LawHub interface</span></span>
        </div>
        <div className="card flex items-start gap-3 p-4 opacity-60">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-ink-2"><Upload className="h-5 w-5" /></span>
          <span><span className="block font-semibold">Import a LawHub PT</span><span className="block text-sm text-ink-2">Phase 3 — official tests count toward your range</span></span>
        </div>
      </div>
      <Card>
        <CardTitle>Recent sections</CardTitle>
        {recent.length === 0 ? (
          <CardDescription>None yet. Your first timed section sets the baseline for the BR gap.</CardDescription>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-ink-2">{format(s.startedAt, "MMM d, h:mm a")} · {s.section} · {s.nQuestions} Q</span>
                <span className="flex items-center gap-2">
                  <Badge tone="neutral">timed {s.scoreRaw}/{s.nQuestions}</Badge>
                  {s.brRaw != null && <Badge tone="info">BR {s.brRaw}/{s.nQuestions}</Badge>}
                  {s.scoreScaled != null && <Badge tone="accent">≈ {s.scoreScaled}</Badge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Button asChild variant="ghost"><Link href="/analytics">See trends in Analytics</Link></Button>
    </div>
  );
}
