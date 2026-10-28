"use client";

/**
 * PassageMap — the RC method as an interactive: for each paragraph, tag its
 * role; mark each named viewpoint as one the author agrees with, rejects, or
 * stays neutral on; write a low-resolution summary. Then compare to the key.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { PARAGRAPH_ROLES, type ParagraphRole } from "@/lib/content/taxonomy";
import { cn } from "@/lib/ui/cn";

export interface PassageMapData {
  title: string;
  paragraphs: string[];
  roles: ParagraphRole[];
  viewpoints: { who: string; position: string; authorAgrees: boolean | null }[];
  tone: string;
  lowResSummary: string;
}

const ROLE_LABEL: Record<ParagraphRole, string> = {
  context: "Context",
  main_point: "Main point",
  support: "Support",
  counterpoint: "Counterpoint",
  concession: "Concession",
  example: "Example",
  implication: "Implication",
  transition: "Transition",
};
const ROLE_TONE: Record<ParagraphRole, string> = {
  context: "border-line-strong bg-bg-sunken text-ink-2",
  main_point: "border-accent bg-accent-soft text-accent",
  support: "border-info bg-info-soft text-info",
  counterpoint: "border-bad bg-bad-soft text-bad",
  concession: "border-warn bg-warn-soft text-warn",
  example: "border-info bg-info-soft text-info",
  implication: "border-ok bg-ok-soft text-ok",
  transition: "border-line-strong bg-bg-sunken text-ink-2",
};
type Stance = "agrees" | "rejects" | "neutral";
const stanceOf = (v: boolean | null): Stance => (v === true ? "agrees" : v === false ? "rejects" : "neutral");

export function PassageMap({ passage, title }: { passage: PassageMapData; title?: string }) {
  const [roles, setRoles] = useState<(ParagraphRole | null)[]>(() => passage.paragraphs.map(() => null));
  const [active, setActive] = useState<number | null>(0);
  const [stances, setStances] = useState<(Stance | null)[]>(() => passage.viewpoints.map(() => null));
  const [summary, setSummary] = useState("");
  const [checked, setChecked] = useState(false);

  const ready = roles.every(Boolean) && stances.every(Boolean) && summary.trim().split(/\s+/).filter(Boolean).length >= 3;
  const summaryWords = summary.trim().split(/\s+/).filter(Boolean).length;
  const score = useMemo(() => {
    const r = roles.filter((x, i) => x === passage.roles[i]).length;
    const v = stances.filter((x, i) => x === stanceOf(passage.viewpoints[i].authorAgrees)).length;
    return { r, v, rTotal: passage.paragraphs.length, vTotal: passage.viewpoints.length };
  }, [roles, stances, passage]);

  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title ?? "Map the passage"}</p>
        <span className="text-xs text-ink-3">Tap a paragraph, tag its role · then viewpoints · then the summary</span>
      </div>
      <p className="mb-2 text-sm font-medium text-ink-2">{passage.title}</p>

      {/* Paragraphs */}
      <ol className="space-y-2">
        {passage.paragraphs.map((p, i) => {
          const r = roles[i];
          const right = checked && r === passage.roles[i];
          const wrong = checked && r && r !== passage.roles[i];
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive(active === i ? null : i)}
                aria-expanded={active === i}
                className={cn("focus-ring w-full rounded-md border px-3 py-2 text-left", active === i ? "border-ink" : "border-line", right && "border-ok bg-ok-soft/50", wrong && "border-bad bg-bad-soft/50")}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">¶{i + 1}</span>
                  {r && <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", ROLE_TONE[r])}>{ROLE_LABEL[r]}</span>}
                  {checked && !right && <span className="text-[11px] text-ink-3">key: {ROLE_LABEL[passage.roles[i]]}</span>}
                </div>
                <p className="lsat-text text-[14px] leading-6 text-ink-2">{p}</p>
              </button>
              {active === i && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                  {PARAGRAPH_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setRoles((rs) => rs.map((x, k) => (k === i ? role : x)));
                        setChecked(false);
                        const next = roles.findIndex((x, k) => k > i && !x);
                        setActive(next === -1 ? null : next);
                      }}
                      className={cn("focus-ring rounded-full border px-2.5 py-1 text-xs font-medium", ROLE_TONE[role], roles[i] === role && "ring-2 ring-ink")}
                    >
                      {ROLE_LABEL[role]}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Viewpoints */}
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Viewpoints — where does the author stand?</p>
        <ul className="space-y-1.5">
          {passage.viewpoints.map((v, i) => {
            const key = stanceOf(v.authorAgrees);
            return (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{v.who}:</span> <span className="text-ink-2">{v.position}</span>
                </span>
                <span className="flex gap-1">
                  {(["agrees", "rejects", "neutral"] as Stance[]).map((s) => {
                    const sel = stances[i] === s;
                    const right = checked && sel && s === key;
                    const wrong = checked && sel && s !== key;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStances((st) => st.map((x, k) => (k === i ? s : x)));
                          setChecked(false);
                        }}
                        className={cn("focus-ring rounded-full border px-2 py-0.5 text-xs capitalize", sel ? "border-ink bg-ink text-bg" : "border-line text-ink-2", right && "border-ok bg-ok text-white", wrong && "border-bad bg-bad text-white")}
                      >
                        {s === "agrees" ? "author agrees" : s === "rejects" ? "author rejects" : "neutral"}
                      </button>
                    );
                  })}
                  {checked && stances[i] !== key && <span className="self-center text-[11px] text-ink-3">key: {key}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Summary */}
      <div className="mt-4">
        <label htmlFor="pm-summary" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Low-resolution summary (≤ 12 words — what is the passage doing?)
        </label>
        <input id="pm-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Author rejects the standard reading in favor of…" className="focus-ring h-9 w-full rounded-md border border-line bg-bg-elev px-2 text-sm" />
        <div className="mt-1 flex items-center justify-between text-xs text-ink-3">
          <span className={cn(summaryWords > 12 && "text-bad")}>{summaryWords} words</span>
          <span>Tone: {checked ? passage.tone : "—"}</span>
        </div>
        {checked && (
          <p className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
            <span className="font-semibold">Key summary: </span>
            {passage.lowResSummary}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs">
          {checked && (
            <span className="flex gap-2">
              <Badge tone={score.r === score.rTotal ? "ok" : "warn"}>
                roles {score.r}/{score.rTotal}
              </Badge>
              <Badge tone={score.v === score.vTotal ? "ok" : "warn"}>
                viewpoints {score.v}/{score.vTotal}
              </Badge>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setRoles(passage.paragraphs.map(() => null)); setStances(passage.viewpoints.map(() => null)); setSummary(""); setChecked(false); setActive(0); }}>
            Reset
          </Button>
          <Button size="sm" onClick={() => setChecked(true)} disabled={!ready}>
            Check
          </Button>
        </div>
      </div>
    </div>
  );
}
