"use client";

/**
 * SetSandbox — two quantified statements about sets A, B, C; the diagram shows
 * what overlap is forced, and a list of candidate conclusions is marked valid
 * or invalid with a one-line reason. Built around the LSAT's some/most/all logic.
 */
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";

type Q = "all" | "most" | "some" | "none";
const Q_LABEL: Record<Q, string> = { all: "All", most: "Most", some: "Some", none: "No" };

interface Stmt {
  q: Q;
  from: "A" | "B" | "C";
  to: "A" | "B" | "C";
}

/**
 * Valid inference rules for two premises sharing the middle term B:
 *   A --q1--> B, B --q2--> C   (or reversed directions)
 * We encode the classic table: all+all→all; all+most (A all B, B most C) → nothing about A–C; most+most (same subject) → some; etc.
 */
function infer(s1: Stmt, s2: Stmt): { conclusion: string; valid: boolean; why: string }[] {
  const out: { conclusion: string; valid: boolean; why: string }[] = [];
  // Chain A→B→C
  if (s1.from === "A" && s1.to === "B" && s2.from === "B" && s2.to === "C") {
    if (s1.q === "all" && s2.q === "all") out.push({ conclusion: "All A are C", valid: true, why: "Chaining two 'all' statements is valid." });
    else out.push({ conclusion: "All A are C", valid: false, why: "Only two 'all' statements chain to 'all'." });
    if (s1.q === "all" && s2.q === "none") out.push({ conclusion: "No A are C", valid: true, why: "All A are B and no B are C, so no A are C." });
    if ((s1.q === "some" || s1.q === "most") && s2.q === "all") out.push({ conclusion: "Some A are C", valid: true, why: `The A that are B (there are ${s1.q === "most" ? "most" : "some"}) are all C.` });
    if (s1.q === "all" && (s2.q === "most" || s2.q === "some")) out.push({ conclusion: "Some A are C", valid: false, why: `The ${s2.q} B that are C might be none of the A. Nothing follows.` });
    if (s1.q === "most" && s2.q === "most") out.push({ conclusion: "Some A are C", valid: false, why: "Most A are B, most B are C — the two 'most' groups can miss each other. Nothing follows." });
    if (s1.q === "some" && s2.q === "some") out.push({ conclusion: "Some A are C", valid: false, why: "Two 'some' statements never chain." });
  }
  // Shared subject B: B→A and B→C
  if (s1.from === "B" && s1.to === "A" && s2.from === "B" && s2.to === "C") {
    if (s1.q === "most" && s2.q === "most") out.push({ conclusion: "Some A are C", valid: true, why: "Two 'most' statements about the same group must overlap." });
    if ((s1.q === "all" && (s2.q === "most" || s2.q === "some")) || (s2.q === "all" && (s1.q === "most" || s1.q === "some")))
      out.push({ conclusion: "Some A are C", valid: true, why: "The B that are in the smaller group are all in the 'all' group too." });
    if (s1.q === "all" && s2.q === "all") out.push({ conclusion: "Some A are C", valid: true, why: "Valid if at least one B exists (the LSAT assumes groups are non-empty)." });
    if (s1.q === "some" && s2.q === "some") out.push({ conclusion: "Some A are C", valid: false, why: "The two 'some' subsets of B may not overlap." });
    if (s1.q === "most" && s2.q === "some") out.push({ conclusion: "Some A are C", valid: false, why: "'Some' B that are C could all fall in the minority that aren't A." });
  }
  if (!out.length) out.push({ conclusion: "Some A are C", valid: false, why: "No rule connects these — rearrange so the shared term B links the statements." });
  return out;
}

export function SetSandbox({ title }: { title?: string }) {
  const [s1, setS1] = useState<Stmt>({ q: "most", from: "A", to: "B" });
  const [s2, setS2] = useState<Stmt>({ q: "most", from: "B", to: "C" });
  const results = useMemo(() => infer(s1, s2), [s1, s2]);

  return (
    <div className="card not-prose my-6 p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold">{title ?? "Some, most, all — what chains and what doesn't"}</p>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <StmtRow s={s1} onChange={setS1} />
          <StmtRow s={s2} onChange={setS2} />
          <div className="mt-3 space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className={cn("rounded-md border px-3 py-2 text-sm", r.valid ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft")}>
                <div className="flex items-center gap-2">
                  <Badge tone={r.valid ? "ok" : "bad"}>{r.valid ? "Valid" : "Invalid"}</Badge>
                  <span className="font-medium">{r.conclusion}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-2">{r.why}</p>
              </div>
            ))}
          </div>
        </div>
        <Venn s1={s1} s2={s2} />
      </div>
      <p className="mt-3 text-xs text-ink-3">Rule of thumb: an inference needs an &quot;all&quot; somewhere in the chain, or two &quot;most&quot;s about the same subject. &quot;Some&quot; + &quot;some&quot; never chains.</p>
    </div>
  );
}

function StmtRow({ s, onChange }: { s: Stmt; onChange: (s: Stmt) => void }) {
  const sel = "focus-ring h-9 rounded-md border border-line bg-bg-elev px-2 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select className={sel} value={s.q} onChange={(e) => onChange({ ...s, q: e.target.value as Q })} aria-label="Quantifier">
        {(["all", "most", "some", "none"] as Q[]).map((q) => (
          <option key={q} value={q}>
            {Q_LABEL[q]}
          </option>
        ))}
      </select>
      <select className={sel} value={s.from} onChange={(e) => onChange({ ...s, from: e.target.value as Stmt["from"] })} aria-label="Subject">
        {["A", "B", "C"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <span className="text-ink-3">are</span>
      <select className={sel} value={s.to} onChange={(e) => onChange({ ...s, to: e.target.value as Stmt["to"] })} aria-label="Predicate">
        {["A", "B", "C"].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}

/** Schematic: three circles; shading suggests the forced overlap for the chosen quantifiers. */
function Venn({ s1, s2 }: { s1: Stmt; s2: Stmt }) {
  const strength = (q: Q) => (q === "all" ? 1 : q === "most" ? 0.6 : q === "some" ? 0.3 : 0);
  const ab = strength(s1.q);
  const bc = strength(s2.q);
  return (
    <svg viewBox="0 0 240 160" width="240" height="160" role="img" aria-label="Three overlapping sets A, B and C" className="mx-auto">
      <title>Sets A, B, C</title>
      <circle cx="80" cy="80" r="55" fill="var(--info)" fillOpacity="0.15" stroke="var(--info)" strokeWidth="1" />
      <circle cx="120" cy="80" r="55" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1" />
      <circle cx="160" cy="80" r="55" fill="var(--ok)" fillOpacity="0.15" stroke="var(--ok)" strokeWidth="1" />
      <ellipse cx="100" cy="80" rx="18" ry="40" fill="var(--info)" fillOpacity={0.15 + ab * 0.4} />
      <ellipse cx="140" cy="80" rx="18" ry="40" fill="var(--ok)" fillOpacity={0.15 + bc * 0.4} />
      <text x="48" y="36" fontSize="13" fill="var(--ink)" fontWeight="600">A</text>
      <text x="116" y="22" fontSize="13" fill="var(--ink)" fontWeight="600">B</text>
      <text x="186" y="36" fontSize="13" fill="var(--ink)" fontWeight="600">C</text>
      <text x="120" y="150" fontSize="10" fill="var(--ink-3)" textAnchor="middle">darker overlap = more forced by the statement</text>
    </svg>
  );
}
