/**
 * Small SVG charts for analytics. Server-renderable (no state): thin marks,
 * one axis each, hover via <title>, text in ink tokens, series colours from
 * the validated --chart-1 / --chart-2 pair, status colours only for status.
 */
import { format } from "date-fns";
import { cn } from "@/lib/ui/cn";

/* ---------- score range over time ---------- */
export function ScoreTrend({ tests, goal }: { tests: { finishedAt: Date | string; scaled: number; brScaled: number | null; rangeLow: number; rangeHigh: number; pt: number | null }[]; goal: number }) {
  if (!tests.length) return <Empty>No full-length tests yet. A simulated PT or a LawHub import starts the trend.</Empty>;
  const W = 640, H = 220, pl = 34, pr = 12, pt = 10, pb = 26;
  const ys = tests.flatMap((t) => [t.scaled, t.brScaled ?? t.scaled, t.rangeLow, t.rangeHigh, goal]);
  const lo = Math.max(120, Math.floor(Math.min(...ys) / 5) * 5 - 5), hi = Math.min(180, Math.ceil(Math.max(...ys) / 5) * 5 + 5);
  const x = (i: number) => pl + (tests.length === 1 ? (W - pl - pr) / 2 : (i / (tests.length - 1)) * (W - pl - pr));
  const y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const band = tests.map((t, i) => `${x(i)},${y(t.rangeHigh)}`).concat([...tests].reverse().map((t, i) => `${x(tests.length - 1 - i)},${y(t.rangeLow)}`)).join(" ");
  const line = (key: "scaled" | "brScaled") => tests.map((t, i) => ({ i, v: t[key] })).filter((p) => p.v != null).map((p, j) => `${j === 0 ? "M" : "L"}${x(p.i)},${y(p.v as number)}`).join(" ");
  const ticks = Array.from({ length: Math.floor((hi - lo) / 5) + 1 }, (_, k) => lo + k * 5);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Scaled score per test with the running score range band and goal line">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={pl - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--ink-3)">
              {v}
            </text>
          </g>
        ))}
        <polygon points={band} fill="var(--chart-1)" opacity="0.12" />
        <line x1={pl} x2={W - pr} y1={y(goal)} y2={y(goal)} stroke="var(--ink-3)" strokeDasharray="4 4" />
        <text x={W - pr} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">
          goal {goal}
        </text>
        <path d={line("brScaled")} fill="none" stroke="var(--chart-2)" strokeWidth="2" />
        <path d={line("scaled")} fill="none" stroke="var(--chart-1)" strokeWidth="2" />
        {tests.map((t, i) => (
          <g key={i}>
            {t.brScaled != null && <circle cx={x(i)} cy={y(t.brScaled)} r="4" fill="var(--chart-2)" stroke="var(--bg-elev)" strokeWidth="2" />}
            <circle cx={x(i)} cy={y(t.scaled)} r="4" fill="var(--chart-1)" stroke="var(--bg-elev)" strokeWidth="2">
              <title>{`${format(new Date(t.finishedAt), "MMM d")}${t.pt ? ` · PT ${t.pt}` : ""} · timed ${t.scaled}${t.brScaled != null ? ` · BR ${t.brScaled}` : ""} · range ${t.rangeLow}–${t.rangeHigh}`}</title>
            </circle>
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
              {format(new Date(t.finishedAt), "M/d")}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-4 rounded-sm bg-chart-1" /> Timed
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-4 rounded-sm bg-chart-2" /> Blind review
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-4 rounded-sm bg-chart-1 opacity-20" /> Score range (last 5)
        </span>
      </figcaption>
    </figure>
  );
}

/* ---------- horizontal bars with a target band (accuracy by level, calibration) ---------- */
export function AccuracyBars({ rows, caption }: { rows: { label: string; acc: number | null; n: number; targetLow?: number; targetHigh?: number; note?: string }[]; caption?: string }) {
  if (rows.every((r) => r.n === 0)) return <Empty>No counted attempts in this window.</Empty>;
  return (
    <div>
      <ul className="space-y-2" aria-label={caption}>
        {rows.map((r) => {
          const pct = r.acc == null ? 0 : Math.round(r.acc * 100);
          const inBand = r.targetLow == null || r.acc == null ? null : r.acc >= r.targetLow && r.acc <= (r.targetHigh ?? 1);
          return (
            <li key={r.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
              <span className="text-ink-2">{r.label}</span>
              <div className="relative h-3 rounded-sm bg-bg-sunken" title={`${r.label}: ${pct}% over ${r.n}`}>
                {r.targetLow != null && <div className="absolute inset-y-0 rounded-sm bg-ink/10" style={{ left: `${r.targetLow * 100}%`, width: `${((r.targetHigh ?? 1) - r.targetLow) * 100}%` }} />}
                <div className={cn("absolute inset-y-0 left-0 rounded-sm", inBand === false ? "bg-warn" : "bg-chart-1")} style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums text-ink">
                {r.acc == null ? "—" : `${pct}%`} <span className="text-ink-3">n={r.n}</span>
                {r.note && <span className="ml-2 text-xs text-ink-3">{r.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {caption && <p className="mt-2 text-xs text-ink-3">{caption}</p>}
    </div>
  );
}

/* ---------- paired bars: seconds right vs wrong, by type ---------- */
export function TimeBars({ rows }: { rows: { label: string; secRight: number; secWrong: number; nRight: number; nWrong: number }[] }) {
  if (!rows.length) return <Empty>Needs timed sections (≥ 3 attempts per type).</Empty>;
  const max = Math.max(...rows.flatMap((r) => [r.secRight, r.secWrong]), 60);
  return (
    <div>
      <ul className="space-y-2">
        {rows.slice(0, 10).map((r) => (
          <li key={r.label} className="grid grid-cols-[150px_1fr] items-center gap-3 text-sm">
            <span className="truncate text-ink-2" title={r.label}>
              {r.label}
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="h-2 rounded-sm bg-chart-1" style={{ width: `${(r.secRight / max) * 100}%` }} title={`right: ${Math.round(r.secRight)}s (n=${r.nRight})`} />
                <span className="text-xs tabular-nums text-ink-3">{Math.round(r.secRight)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 rounded-sm bg-chart-2" style={{ width: `${(r.secWrong / max) * 100}%` }} title={`wrong: ${Math.round(r.secWrong)}s (n=${r.nWrong})`} />
                <span className="text-xs tabular-nums text-ink-3">{Math.round(r.secWrong)}s</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-4 rounded-sm bg-chart-1" /> seconds when right
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-4 rounded-sm bg-chart-2" /> seconds when wrong
        </span>
      </p>
    </div>
  );
}

/* ---------- study quality ring ---------- */
export function QualityRing({ total, size = 96 }: { total: number; size?: number }) {
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Study quality ${total} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-1)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(total / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fontSize={size / 4} fontWeight="600" fill="var(--ink)">
        {total}
      </text>
    </svg>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink-3">{children}</p>;
}
