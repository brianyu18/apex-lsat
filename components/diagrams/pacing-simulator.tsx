"use client";

/**
 * PacingSimulator — a 35-minute LR section as a cumulative-time curve.
 * Sliders set seconds on easy / medium / hard questions, number of first-pass
 * skips, and an optional single time bleed. The chart shows where the clock
 * runs out against the checkpoint targets, so pacing rules become visible
 * instead of memorized.
 */
import { useMemo, useState } from "react";
import { LR_CHECKPOINTS } from "@/lib/engine/pacing";
import { cn } from "@/lib/ui/cn";

type Preset = { label: string; easy: number; medium: number; hard: number; skips: number; bleed: boolean };
const PRESETS: Preset[] = [
  { label: "Even pace", easy: 80, medium: 80, hard: 80, skips: 0, bleed: false },
  { label: "Fast early, slow late", easy: 50, medium: 80, hard: 115, skips: 0, bleed: false },
  { label: "One bleed", easy: 50, medium: 80, hard: 115, skips: 0, bleed: true },
  { label: "Skip and return", easy: 50, medium: 80, hard: 130, skips: 3, bleed: false },
];

// A realistic 25-question difficulty layout: easy early, hard clustered 15–22, easier close.
const LAYOUT: ("e" | "m" | "h")[] = ["e", "e", "e", "m", "e", "m", "m", "e", "m", "m", "h", "m", "m", "h", "m", "h", "h", "m", "h", "h", "m", "h", "m", "m", "e"];

export function PacingSimulator({ n = 25, totalSec = 35 * 60 }: { n?: number; totalSec?: number }) {
  const [easy, setEasy] = useState(50);
  const [medium, setMedium] = useState(80);
  const [hard, setHard] = useState(115);
  const [skips, setSkips] = useState(0);
  const [bleed, setBleed] = useState(false);

  const sim = useMemo(() => {
    const layout = LAYOUT.slice(0, n);
    const secs = layout.map((d) => (d === "e" ? easy : d === "m" ? medium : hard));
    // Skips: the `skips` hardest questions take 10 s on the first pass and are revisited at the end at full cost.
    const hardIdx = layout.map((d, i) => (d === "h" ? i : -1)).filter((i) => i >= 0).slice(0, skips);
    const firstPass = secs.map((s, i) => (hardIdx.includes(i) ? 10 : s));
    if (bleed) {
      const b = layout.indexOf("h");
      if (b >= 0 && !hardIdx.includes(b)) firstPass[b] = 240;
    }
    const seq: { label: string; sec: number; kind: "e" | "m" | "h" | "return" }[] = firstPass.map((s, i) => ({ label: `Q${i + 1}`, sec: s, kind: hardIdx.includes(i) ? "h" : layout[i] }));
    for (const i of hardIdx) seq.push({ label: `Q${i + 1}↩`, sec: secs[i], kind: "return" });
    let cum = 0;
    const pts = seq.map((s) => {
      cum += s.sec;
      return { ...s, cum };
    });
    const reached = pts.filter((p) => p.cum <= totalSec).length;
    const answered = Math.min(reached, n);
    const leftover = totalSec - (pts[pts.length - 1]?.cum ?? 0);
    const firstPassEnd = pts[n - 1]?.cum ?? 0;
    return { pts, reached, answered, leftover, firstPassEnd, total: pts[pts.length - 1]?.cum ?? 0 };
  }, [easy, medium, hard, skips, bleed, n, totalSec]);

  // chart geometry
  const W = 640, H = 220, padL = 36, padR = 12, padT = 12, padB = 28;
  const x = (i: number) => padL + (i / Math.max(1, sim.pts.length - 1)) * (W - padL - padR);
  const y = (sec: number) => padT + (1 - Math.min(sec, totalSec * 1.25) / (totalSec * 1.25)) * (H - padT - padB);
  const path = sim.pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join(" ");
  const over = sim.total > totalSec;

  function applyPreset(p: Preset) {
    setEasy(p.easy);
    setMedium(p.medium);
    setHard(p.hard);
    setSkips(p.skips);
    setBleed(p.bleed);
  }

  return (
    <div className="card not-prose my-6 p-4 sm:p-5" data-testid="pacing-simulator">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Pacing simulator · {n} questions · {Math.round(totalSec / 60)} minutes</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p)} className="focus-ring rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-line-strong">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Cumulative time curve: ${over ? `runs out after question ${sim.answered}` : `finishes with ${Math.round(sim.leftover / 60)} minutes to spare`}`}>
        {/* time limit */}
        <line x1={padL} x2={W - padR} y1={y(totalSec)} y2={y(totalSec)} stroke="var(--bad)" strokeDasharray="4 4" />
        <text x={padL + 4} y={y(totalSec) - 4} textAnchor="start" fontSize="10" fill="var(--bad)">
          {Math.round(totalSec / 60)}:00 limit
        </text>
        {/* checkpoints */}
        {LR_CHECKPOINTS.filter((c) => c.afterQuestion <= n).map((c) => (
          <g key={c.afterQuestion}>
            <circle cx={x(c.afterQuestion - 1)} cy={y(c.minutes * 60)} r="4" fill="var(--bg-elev)" stroke="var(--ink-3)" />
            <text x={x(c.afterQuestion - 1)} y={y(c.minutes * 60) + 16} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
              Q{c.afterQuestion} · {c.minutes}m
            </text>
          </g>
        ))}
        {/* axes */}
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="var(--line)" />
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--line)" />
        {[0, 10, 20, 30, 40].map((m) => (
          <text key={m} x={padL - 6} y={y(m * 60) + 3} textAnchor="end" fontSize="10" fill="var(--ink-3)">
            {m}
          </text>
        ))}
        {/* curve */}
        <path d={path} fill="none" stroke={over ? "var(--bad)" : "var(--accent)"} strokeWidth="2" />
        {sim.pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.cum)} r={p.sec >= 200 ? 5 : 2.5} fill={p.kind === "return" ? "var(--warn)" : p.cum > totalSec ? "var(--bad)" : p.sec >= 200 ? "var(--bad)" : "var(--accent)"}>
            <title>{`${p.label}: ${p.sec}s (cumulative ${Math.floor(p.cum / 60)}:${String(p.cum % 60).padStart(2, "0")})`}</title>
          </circle>
        ))}
        <text x={(padL + W - padR) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-3)">
          questions in the order you take them (↩ = return to a skipped question)
        </text>
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <Slider label="Easy question" value={easy} min={30} max={120} onChange={setEasy} />
          <Slider label="Medium question" value={medium} min={45} max={160} onChange={setMedium} />
          <Slider label="Hard question" value={hard} min={60} max={240} onChange={setHard} />
          <Slider label="First-pass skips (hardest first)" value={skips} min={0} max={5} onChange={setSkips} unit="" />
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)} /> Add one 4-minute time bleed on the first hard question
          </label>
        </div>
        <div className={cn("rounded-md p-3 text-sm", over ? "bg-bad-soft text-ink" : "bg-ok-soft text-ink")}>
          {over ? (
            <>
              <p className="font-semibold text-bad">Clock runs out after {sim.answered} of {n}.</p>
              <p className="mt-1">
                You are {Math.ceil((sim.total - totalSec) / 60)} min over. {skips > 0 ? "Skipped questions come back at full cost — skipping buys order, not time." : "Every second over 35:00 is a question you never saw."}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ok">All {n} answered with {Math.floor(sim.leftover / 60)}:{String(sim.leftover % 60).padStart(2, "0")} to spare.</p>
              <p className="mt-1">First pass ends at {Math.floor(sim.firstPassEnd / 60)}:{String(sim.firstPassEnd % 60).padStart(2, "0")}{skips > 0 ? `; ${skips} return${skips > 1 ? "s" : ""} fill the rest.` : "."}</p>
            </>
          )}
          <p className="mt-2 text-xs text-ink-3">Hollow dots are the checkpoints (Q10 by 9:00, Q15 by 15:00, Q20 by 24:00, Q25 by 33:00). Being above a dot means you are behind.</p>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange, unit = "s" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-ink-2">
        <span>{label}</span>
        <span className="tabular-nums text-ink">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
    </label>
  );
}
