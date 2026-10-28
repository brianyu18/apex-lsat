import Link from "next/link";
import { format } from "date-fns";
import { analyticsData } from "@/lib/data/analytics";
import { interpretBrGap } from "@/lib/scoring/range";
import { qualityBand } from "@/lib/scoring/quality";
import { AccuracyBars, QualityRing, ScoreTrend, TimeBars } from "@/components/analytics/charts";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const d = await analyticsData();
  const r = d.history.range;
  const gap = interpretBrGap(r.brGap);
  const band = qualityBand(d.quality.total);
  const ranked = d.pri.rows.filter((x) => x.status === "ranked");
  const thin = d.pri.rows.filter((x) => x.status === "thin");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Analytics</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Where the next point is</h1>
        <p className="mt-1 text-ink-2">Score range, blind-review gap, priorities by expected points lost, calibration, and how well the month was spent.</p>
      </header>

      {/* Headline row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4" data-testid="range-card">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Score range</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{r.n ? `${r.low}–${r.high}` : "—"}</p>
          <p className="text-xs text-ink-3">{r.n ? `mean ${r.mean} over last ${r.n} test${r.n > 1 ? "s" : ""} · goal ${d.goal}` : "after your first full test"}</p>
          {r.n > 0 && r.low != null && (
            <Badge tone={r.low >= d.goal ? "ok" : r.high != null && r.high >= d.goal ? "warn" : "neutral"} className="mt-2">
              {r.low >= d.goal ? "Range floor at goal — register" : r.high != null && r.high >= d.goal ? "Goal inside the range" : `${Math.round(d.goal - (r.mean ?? 0))} below goal`}
            </Badge>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Blind-review gap</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{r.brGap == null ? "—" : `${r.brGap > 0 ? "+" : ""}${r.brGap}`}</p>
          <p className="text-xs text-ink-3">{gap.label}</p>
          <p className="mt-2 text-xs text-ink-2">{gap.advice}</p>
        </Card>
        <Card className="flex items-center gap-4 p-4" data-testid="quality-card">
          <QualityRing total={d.quality.total} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Study quality · 30 days</p>
            <p className="mt-1 font-semibold">{band.label}</p>
            <p className="text-xs text-ink-2">{band.advice}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Score trend</CardTitle>
        <CardDescription>Timed and blind-review scaled scores per full-length test, with the running range.</CardDescription>
        <div className="mt-3">
          <ScoreTrend tests={d.history.tests} goal={d.goal} />
        </div>
        {d.sections.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-2">Timed sections (scaled equivalents) · {d.sections.length}</summary>
            <ul className="mt-2 flex flex-wrap gap-2">
              {d.sections.map((s) => (
                <li key={s.id} className="rounded-md border border-line px-2 py-1 text-xs">
                  {format(new Date(s.finishedAt), "M/d")} {s.section} {s.scaled}
                  {s.brScaled != null && <span className="text-ink-3"> / BR {s.brScaled}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="priorities-card">
          <div className="flex items-baseline justify-between">
            <CardTitle>Priorities</CardTitle>
            <span className="text-xs text-ink-3">{d.pri.pointsOnTable} expected points on the table per test</span>
          </div>
          <CardDescription>(1 − accuracy) × how often it appears. The top rows are the cheapest points you aren&apos;t getting.</CardDescription>
          {ranked.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">Needs at least 5 counted attempts on a type or tag.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-ink-3">
                <tr className="border-b border-line">
                  <th className="py-1.5 font-medium">Skill</th>
                  <th className="py-1.5 font-medium">Acc</th>
                  <th className="py-1.5 font-medium">n</th>
                  <th className="py-1.5 text-right font-medium">Pts / test</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 10).map((p) => (
                  <tr key={`${p.dimension}:${p.key}`} className="border-b border-line last:border-b-0">
                    <td className="py-1.5">
                      {p.label} <span className="text-xs text-ink-3">{p.dimension === "tag" ? "tag" : p.dimension === "rc_qtype" ? "RC" : "LR"}</span>
                    </td>
                    <td className={cn("py-1.5 tabular-nums", (p.accuracy ?? 1) < 0.7 && "text-bad")}>{Math.round((p.accuracy ?? 0) * 100)}%</td>
                    <td className="py-1.5 tabular-nums text-ink-3">{p.n}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.lostPerTest.toFixed(1)}</td>
                    <td className="py-1.5 text-right">
                      <Link href={drillHref(p)} className="text-xs text-accent hover:underline">
                        drill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {thin.length > 0 && <p className="mt-2 text-xs text-ink-3">Not enough data yet: {thin.slice(0, 8).map((t) => t.label).join(", ")}{thin.length > 8 ? "…" : ""}</p>}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Accuracy by level · 30 days</CardTitle>
            <div className="mt-3">
              <AccuracyBars rows={d.levels.map((l) => ({ label: `Level ${l.level}`, acc: l.acc, n: l.n }))} caption="Levels 1–2 should sit above 90% before timed work; level 4 is where 175+ is decided." />
            </div>
          </Card>
          <Card data-testid="calibration-card">
            <CardTitle>Calibration · 30 days</CardTitle>
            <div className="mt-3">
              <AccuracyBars rows={d.cal.map((c) => ({ label: c.confidence[0].toUpperCase() + c.confidence.slice(1), acc: c.acc, n: c.n, targetLow: c.targetLow, targetHigh: c.targetHigh, note: c.verdict === "—" ? undefined : c.verdict }))} caption="Grey band = target. 'Sure' below 90% is overconfidence: slow down on confirmation. 'Guess' above 45% is underconfidence: trust the first read." />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Study quality breakdown</CardTitle>
          <ul className="mt-3 space-y-2">
            {d.quality.parts.map((p) => (
              <li key={p.key} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 text-sm">
                <span className="text-ink-2">{p.label}</span>
                <div className="h-2 rounded-sm bg-bg-sunken">
                  <div className="h-2 rounded-sm bg-chart-1" style={{ width: `${(p.points / p.max) * 100}%` }} />
                </div>
                <span className="tabular-nums">
                  {p.points}/{p.max} <span className="text-xs text-ink-3">{p.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Time on right vs. wrong · timed, 60 days</CardTitle>
          <CardDescription>Types where wrong answers take much longer than right ones are time bleeds; skip them on the first pass.</CardDescription>
          <div className="mt-3">
            <TimeBars rows={d.times} />
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/test/timing">Timing heatmap</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/review">Review inbox</Link>
        </Button>
      </div>
    </div>
  );
}

function drillHref(p: { dimension: string; key: string }) {
  if (p.dimension === "rc_qtype") return `/drill/rc?s=${encodeURIComponent(JSON.stringify({ passages: 2, predictionMode: false, qtypes: [p.key] }))}`;
  const s = p.dimension === "tag" ? { tags: [p.key], count: 10 } : { types: [p.key], count: 10 };
  return `/drill/session?s=${encodeURIComponent(JSON.stringify(s))}`;
}
