import Link from "next/link";
import { schoolsData } from "@/lib/data/schools";
import { BAND_LABEL, type Odds } from "@/lib/schools/odds";
import { Badge, Card, CardDescription, CardTitle, Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { saveGpaAction, toggleTargetAction } from "./actions";

export const metadata = { title: "Schools" };
export const dynamic = "force-dynamic";

const TONE: Record<Odds["band"], "ok" | "accent" | "warn" | "neutral"> = { likely: "ok", target: "accent", reach: "warn", long_shot: "neutral" };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "targets", label: "My targets" },
  { key: "t14", label: "Top 14" },
  { key: "ca", label: "California" },
] as const;

export default async function SchoolsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "all", q = "" } = await searchParams;
  const d = await schoolsData();
  const query = q.trim().toLowerCase();
  const rows = d.rows.filter((r) => (f === "targets" ? r.target : f === "t14" ? r.school.tags?.includes("t14") : f === "ca" ? r.school.state === "CA" : true)).filter((r) => !query || r.school.name.toLowerCase().includes(query));
  const score = d.current ?? d.goal;
  const scoreLabel = d.current != null ? `your current range mean (${d.current})` : `your goal (${d.goal}) — no full tests yet`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Schools</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Where you stand</h1>
        <p className="mt-1 text-ink-2">Every ABA school&apos;s entering-class LSAT and GPA percentiles against your numbers, with an admission estimate. Odds computed at {scoreLabel}{d.gpa != null ? ` and GPA ${d.gpa.toFixed(2)}` : " — add your GPA for a two-factor estimate"}.</p>
      </header>

      {d.rows.length === 0 ? (
        <Card>
          <CardTitle>No school data loaded yet</CardTitle>
          <CardDescription>
            Download the ABA Standard 509 compilation (all schools) from abarequireddisclosures.org, then run <code>pnpm tsx scripts/ingest-509.ts &lt;file.xlsx&gt; --year=2025</code>. The page fills in from <code>content/schools/schools.json</code>. Numbers are never typed in by hand.
          </CardDescription>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map((x) => (
                  <Link key={x.key} href={`/schools?f=${x.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("focus-ring rounded-md border px-3 py-1.5 text-sm", f === x.key ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2 hover:border-line-strong")}>
                    {x.label}
                    {x.key === "targets" && d.targets.length ? ` · ${d.targets.length}` : ""}
                  </Link>
                ))}
                <form className="ml-auto flex gap-2" action="/schools">
                  <input type="hidden" name="f" value={f} />
                  <Input name="q" defaultValue={q} placeholder="Search schools" className="h-9 w-48" aria-label="Search schools" />
                </form>
              </div>
              <p className="mt-3 text-xs text-ink-3">
                Data: ABA Standard 509 reports, {d.year}. Bands: likely ≥ 60% · target 25–60% · reach 8–25% · long shot &lt; 8%. The estimate shifts the school&apos;s acceptance rate by where you sit in its class on LSAT (weighted 2:1) and GPA; it ignores essays, work history and timing.
              </p>
            </Card>
            <Card className="p-4">
              <form action={saveGpaAction} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="gpa">Undergraduate GPA (LSAC scale)</Label>
                  <Input id="gpa" name="gpa" type="number" step="0.01" min={0} max={4.33} defaultValue={d.gpa ?? ""} placeholder="3.70" />
                </div>
                <Button type="submit" variant="outline">
                  Save
                </Button>
              </form>
              {d.targetGoal != null && (
                <p className="mt-3 text-xs text-ink-2">
                  Most selective target median: <span className="font-semibold text-ink">{d.targetGoal}</span>. {d.targetGoal > d.goal ? "This raises the registration goal on your plan." : `Your goal of ${d.goal} already clears it.`}
                </p>
              )}
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm" data-testid="schools-table">
              <thead className="text-left text-xs text-ink-3">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">School</th>
                  <th className="px-3 py-2 font-medium">LSAT 25 / 50 / 75</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">GPA 25 / 50 / 75</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">You</th>
                  <th className="px-3 py-2 font-medium">Odds</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">To target / likely</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const o = r.current ?? r.atGoal;
                  return (
                    <tr key={r.school.id} className={cn("border-b border-line last:border-b-0", r.target && "bg-accent-soft/30")}>
                      <td className="px-3 py-2">
                        <span className="font-medium">{r.school.name}</span>
                        <span className="ml-1 text-xs text-ink-3">{r.school.state}</span>
                        {r.school.tags?.includes("t14") && <Badge tone="neutral" className="ml-1">T14</Badge>}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        <Range lo={r.school.lsat25} mid={r.school.lsat50} hi={r.school.lsat75} you={score} min={140} max={180} />
                      </td>
                      <td className="hidden px-3 py-2 tabular-nums md:table-cell">
                        {r.school.gpa25.toFixed(2)} / {r.school.gpa50.toFixed(2)} / {r.school.gpa75.toFixed(2)}
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-ink-2 sm:table-cell">
                        LSAT {o.lsatPercentile}th{o.gpaPercentile != null ? ` · GPA ${o.gpaPercentile}th` : ""}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={TONE[o.band]}>
                          {BAND_LABEL[o.band]} · {Math.round(o.probability * 100)}%
                        </Badge>
                        {r.atLow && r.atHigh && r.atLow.band !== r.atHigh.band && <span className="ml-1 text-xs text-ink-3">range {Math.round(r.atLow.probability * 100)}–{Math.round(r.atHigh.probability * 100)}%</span>}
                      </td>
                      <td className="hidden px-3 py-2 text-xs tabular-nums text-ink-2 md:table-cell">
                        {o.lsatForTarget ?? "—"} / {o.lsatForLikely ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <form action={toggleTargetAction}>
                          <input type="hidden" name="id" value={r.school.id} />
                          <button type="submit" className={cn("focus-ring rounded-md border px-2 py-1 text-xs", r.target ? "border-accent text-accent" : "border-line text-ink-3 hover:text-ink")} aria-pressed={r.target}>
                            {r.target ? "Target ✓" : "Target"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-ink-3">
                      Nothing matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

/** 25–75 band with the median tick and the student's score marker, on a fixed LSAT axis. */
function Range({ lo, mid, hi, you, min, max }: { lo: number; mid: number; hi: number; you: number; min: number; max: number }) {
  const x = (v: number) => `${((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs">
        {lo} / {mid} / {hi}
      </span>
      <div className="relative h-3 w-28 rounded-sm bg-bg-sunken" title={`25th ${lo} · median ${mid} · 75th ${hi} · you ${you}`}>
        <div className="absolute inset-y-0 rounded-sm bg-ink/15" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
        <div className="absolute inset-y-0 w-px bg-ink/50" style={{ left: x(mid) }} />
        <div className={cn("absolute -top-0.5 h-4 w-1 rounded-sm", you >= mid ? "bg-ok" : you >= lo ? "bg-warn" : "bg-bad")} style={{ left: `calc(${x(you)} - 2px)` }} aria-label={`you: ${you}`} />
      </div>
    </div>
  );
}
