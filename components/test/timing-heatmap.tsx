import { format } from "date-fns";
import { lrTargetCumulative, timeBleeds } from "@/lib/engine/pacing";
import { typeLabel } from "@/lib/content/labels";
import { cn } from "@/lib/ui/cn";
import type { timingGrid } from "@/lib/data/sections";

type Grid = Awaited<ReturnType<typeof timingGrid>>;

/**
 * One row per section, one cell per question. Cell colour = seconds spent
 * relative to that question's pacing target; a ring marks a miss; a dot marks
 * a blind-review flag. Reads left-to-right like the section did.
 */
export function TimingHeatmap({ grid }: { grid: Grid }) {
  if (!grid.length) return <p className="text-sm text-ink-3">No finished sections yet. The heatmap fills in after your first timed section.</p>;
  const maxN = Math.max(...grid.map((g) => g.cells.length));
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-bg-elev pr-2 text-left font-medium text-ink-3">Section</th>
              {Array.from({ length: maxN }, (_, i) => (
                <th key={i} className="w-7 text-center font-normal tabular-nums text-ink-3">
                  {(i + 1) % 5 === 0 || i === 0 ? i + 1 : ""}
                </th>
              ))}
              <th className="pl-2 text-left font-medium text-ink-3">Bleeds</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((g) => {
              const secs = g.cells.map((c) => c.seconds);
              const n = secs.length || 1;
              const bleeds = new Set(timeBleeds(secs));
              return (
                <tr key={g.id}>
                  <td className="sticky left-0 whitespace-nowrap bg-bg-elev pr-2 text-ink-2">
                    {format(g.startedAt, "MMM d")} · {g.kind === "skip_trainer" ? "Skip" : g.section} · {g.scoreRaw ?? "–"}/{g.nQuestions}
                  </td>
                  {Array.from({ length: maxN }, (_, i) => {
                    const c = g.cells[i];
                    if (!c) return <td key={i} />;
                    // per-question target = increment of the cumulative curve
                    const target = lrTargetCumulative(i, n, g.durationSec) - (i > 0 ? lrTargetCumulative(i - 1, n, g.durationSec) : 0);
                    const ratio = target > 0 ? c.seconds / target : 1;
                    const title = `Q${i + 1} · ${typeLabel(c.type)} L${c.difficulty} · ${Math.round(c.seconds)}s (target ~${Math.round(target)}s) · ${c.correct == null ? "blank" : c.correct ? "right" : "wrong"}${c.flagged ? " · flagged" : ""}`;
                    return (
                      <td key={i} title={title} className="p-0">
                        <div className={cn("relative mx-auto flex h-7 w-7 items-center justify-center rounded-sm", heat(ratio), c.correct === false && "ring-2 ring-inset ring-bad", c.correct == null && "ring-2 ring-inset ring-line-strong")} aria-label={title}>
                          {c.flagged && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-ink" />}
                          <span className="text-[10px] tabular-nums text-ink">{Math.round(c.seconds)}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="pl-2 tabular-nums text-ink-2">{bleeds.size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Legend />
      <PositionSummary grid={grid} />
    </div>
  );
}

function heat(ratio: number) {
  if (ratio < 0.6) return "bg-ok/15";
  if (ratio < 1.0) return "bg-ok/35";
  if (ratio < 1.5) return "bg-warn/40";
  if (ratio < 2.2) return "bg-warn/70";
  return "bg-bad/60";
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-2">
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-sm bg-ok/35" /> under target
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-sm bg-warn/40" /> up to 1.5× target
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-sm bg-warn/70" /> up to 2.2×
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-sm bg-bad/60" /> time bleed
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-sm ring-2 ring-inset ring-bad" /> wrong
      </span>
      <span className="flex items-center gap-1.5">
        <i className="relative inline-block h-3 w-3 rounded-sm bg-bg-sunken">
          <i className="absolute right-0 top-0 h-1 w-1 rounded-full bg-ink" />
        </i>{" "}
        flagged
      </span>
    </div>
  );
}

/** Where in the section the time goes: thirds, plus the types that eat the most minutes. */
function PositionSummary({ grid }: { grid: Grid }) {
  const thirds = [0, 0, 0];
  const counts = [0, 0, 0];
  const missThirds = [0, 0, 0];
  const byType = new Map<string, { secs: number; n: number; wrong: number }>();
  for (const g of grid) {
    const n = g.cells.length;
    g.cells.forEach((c, i) => {
      const t = Math.min(2, Math.floor((i / n) * 3));
      thirds[t] += c.seconds;
      counts[t] += 1;
      if (c.correct === false) missThirds[t] += 1;
      const e = byType.get(c.type) ?? { secs: 0, n: 0, wrong: 0 };
      e.secs += c.seconds;
      e.n += 1;
      if (c.correct === false) e.wrong += 1;
      byType.set(c.type, e);
    });
  }
  const slowest = Array.from(byType.entries())
    .filter(([, v]) => v.n >= 3)
    .map(([k, v]) => ({ type: k, avg: v.secs / v.n, miss: v.wrong / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-4">
        <p className="text-sm font-semibold">By section third</p>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          {["First third", "Middle third", "Last third"].map((l, i) => (
            <li key={l} className="flex justify-between">
              <span>{l}</span>
              <span className="tabular-nums">
                {counts[i] ? Math.round(thirds[i] / counts[i]) : "–"}s / Q · {counts[i] ? Math.round((missThirds[i] / counts[i]) * 100) : 0}% wrong
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-3">A last third that is both slow and wrong is the signature of a section that ran out of time; a fast, wrong last third means you were guessing at the buzzer.</p>
      </div>
      <div className="card p-4">
        <p className="text-sm font-semibold">Slowest types (avg seconds, ≥ 3 seen)</p>
        <ul className="mt-2 space-y-1 text-sm text-ink-2">
          {slowest.length === 0 && <li className="text-ink-3">Not enough data yet.</li>}
          {slowest.map((s) => (
            <li key={s.type} className="flex justify-between">
              <span>{typeLabel(s.type)}</span>
              <span className="tabular-nums">
                {Math.round(s.avg)}s · {Math.round(s.miss * 100)}% wrong · n={s.n}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-3">Slow and accurate is a candidate for a first-pass skip. Slow and inaccurate is a drill target — go untimed on it until the method is automatic.</p>
      </div>
    </div>
  );
}
