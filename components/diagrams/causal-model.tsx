"use client";

/**
 * CausalModel — a correlation→causation argument drawn as X → Y, with four
 * attack buttons that each redraw the diagram to show the alternative story:
 * alternative cause, reverse causation, coincidence/sampling, and the
 * "no cause, no effect" strengthener. Each shows how the LSAT phrases it.
 */
import { useState } from "react";
import { cn } from "@/lib/ui/cn";

type Mode = "claim" | "alt" | "reverse" | "coincidence" | "strengthen";

const MODES: { id: Mode; label: string; blurb: string; lsat: string }[] = [
  { id: "claim", label: "The claim", blurb: "X and Y go together, so X causes Y.", lsat: "Correlation stated as premise; causation asserted as conclusion." },
  { id: "alt", label: "Alternative cause", blurb: "Something else (Z) produces both X and Y.", lsat: "Weaken: \"Cities with more parks also tend to have higher incomes.\"" },
  { id: "reverse", label: "Reverse causation", blurb: "Y causes X, not the other way round.", lsat: "Weaken: \"People who are already healthy are more likely to join gyms.\"" },
  { id: "coincidence", label: "Coincidence / sample", blurb: "The correlation is an artifact of the sample or chance.", lsat: "Weaken: \"The study included only 12 participants, all volunteers.\"" },
  { id: "strengthen", label: "No cause, no effect", blurb: "Where X is absent, Y is absent too — the pattern that supports causation.", lsat: "Strengthen: \"Towns that never adopted the policy saw no drop in crime.\"" },
];

export function CausalModel({ x = "X", y = "Y", z = "Z", title }: { x?: string; y?: string; z?: string; title?: string }) {
  const [mode, setMode] = useState<Mode>("claim");
  const m = MODES.find((k) => k.id === mode)!;
  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold">{title ?? "Four ways to attack (or support) a causal claim"}</p>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-wrap gap-1.5 md:flex-col">
          {MODES.map((k) => (
            <button key={k.id} type="button" onClick={() => setMode(k.id)} className={cn("focus-ring rounded-md border px-3 py-2 text-left text-sm", mode === k.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")} aria-pressed={mode === k.id}>
              <span className="block font-medium">{k.label}</span>
              <span className="hidden text-xs text-ink-3 md:block">{k.blurb}</span>
            </button>
          ))}
        </div>
        <div>
          <Diagram mode={mode} x={x} y={y} z={z} />
          <p className="mt-2 text-sm text-ink-2">{m.blurb}</p>
          <p className="mt-1 rounded-md bg-bg-sunken px-3 py-2 text-xs text-ink-2">
            <span className="font-medium text-ink">On the test: </span>
            {m.lsat}
          </p>
        </div>
      </div>
    </div>
  );
}

function Diagram({ mode, x, y, z }: { mode: Mode; x: string; y: string; z: string }) {
  const node = (cx: number, cy: number, label: string, tone: string, dim = false) => (
    <g opacity={dim ? 0.35 : 1}>
      <rect x={cx - 44} y={cy - 18} width="88" height="36" rx="8" fill={tone === "ink-2" ? "var(--bg-sunken)" : `var(--${tone}-soft)`} stroke={`var(--${tone})`} strokeWidth="1" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill={`var(--${tone})`}>
        {label}
      </text>
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, dashed = false, label?: string) => (
    <g>
      <defs>
        <marker id={`m-${color}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M1 1L9 5L1 9" fill="none" stroke={`var(--${color})`} strokeWidth="1.5" />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`var(--${color})`} strokeWidth="1.5" strokeDasharray={dashed ? "4 3" : undefined} markerEnd={`url(#m-${color})`} />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="10" fill={`var(--${color})`}>
          {label}
        </text>
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 300 150" width="100%" height="150" role="img" aria-label={`Causal diagram, ${mode}`}>
      <title>Causal diagram</title>
      {mode === "claim" && (
        <>
          {node(70, 75, x, "info")}
          {node(230, 75, y, "accent")}
          {arrow(116, 75, 184, 75, "ink-2", false, "causes?")}
        </>
      )}
      {mode === "alt" && (
        <>
          {node(70, 110, x, "info")}
          {node(230, 110, y, "accent")}
          {node(150, 32, z, "warn")}
          {arrow(126, 50, 90, 90, "warn")}
          {arrow(174, 50, 210, 90, "warn")}
          {arrow(116, 110, 184, 110, "bad", true, "✗")}
        </>
      )}
      {mode === "reverse" && (
        <>
          {node(70, 75, x, "info")}
          {node(230, 75, y, "accent")}
          {arrow(184, 75, 116, 75, "warn", false, "actually")}
        </>
      )}
      {mode === "coincidence" && (
        <>
          {node(70, 75, x, "info")}
          {node(230, 75, y, "accent")}
          {arrow(116, 75, 184, 75, "bad", true, "✗")}
          <text x="150" y="125" textAnchor="middle" fontSize="11" fill="var(--warn)">
            small / biased sample · chance
          </text>
        </>
      )}
      {mode === "strengthen" && (
        <>
          {node(70, 45, x, "info")}
          {node(230, 45, y, "accent")}
          {arrow(116, 45, 184, 45, "ok", false, "✓")}
          {node(70, 115, `no ${x}`, "ink-2", true)}
          {node(230, 115, `no ${y}`, "ink-2", true)}
          {arrow(116, 115, 184, 115, "ok", true)}
        </>
      )}
    </svg>
  );
}
