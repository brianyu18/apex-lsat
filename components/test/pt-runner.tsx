"use client";

/**
 * Full practice test: 4 sections in the LawHub shell, 10-minute break after
 * section 2, blind review of flagged/blank scored questions, then results.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { LawHubSection, type SecAnswer, type SecPassage, type SecQ } from "./lawhub-section";
import { interpretBrGap } from "@/lib/scoring/range";
import { percentile } from "@/lib/scoring/tables";
import { cn } from "@/lib/ui/cn";

type Build = { sessionId: string; sections: { index: number; kind: "LR" | "RC"; scored: boolean; questions: SecQ[]; passages?: SecPassage[] }[]; breakAfter: number; durationSec: number };
type Phase = "setup" | "intro" | "section" | "break" | "br" | "results" | "error";
type Final = { total: number; timedRaw: number; brRaw: number; gap: number; timedScaled: number; brScaled: number; recovered: number; stuck: number; blindSpots: number; perSection: { index: number; kind: string; scored: boolean; n: number; correct: number; br: number; seconds: number }[] };

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export function PtRunner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [build, setBuild] = useState<Build | null>(null);
  const [si, setSi] = useState(0);
  const [experimental, setExperimental] = useState<"random" | "LR" | "RC">("random");
  const [error, setError] = useState<string | null>(null);
  const [breakLeft, setBreakLeft] = useState(600);
  const [reviewQs, setReviewQs] = useState<SecQ[]>([]);
  const [reviewPs, setReviewPs] = useState<SecPassage[]>([]);
  const [brIdx, setBrIdx] = useState(0);
  const [brAnswers, setBrAnswers] = useState<Record<string, string>>({});
  const [timedAnswers, setTimedAnswers] = useState<Record<string, string | null>>({});
  const [final, setFinal] = useState<Final | null>(null);

  useEffect(() => {
    if (phase !== "break") return;
    const t = setInterval(() => setBreakLeft((b) => (b <= 1 ? 0 : b - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === "break" && breakLeft === 0) startNext();
  }, [breakLeft, phase]);

  async function start() {
    setError(null);
    const res = await fetch("/api/pt/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ experimental }) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `Could not build a test (${res.status})`);
      return;
    }
    setBuild((await res.json()) as Build);
    setSi(0);
    setPhase("intro");
  }
  function startNext() {
    setPhase("section");
  }
  async function onSectionSubmit(answers: SecAnswer[], elapsedSec: number) {
    if (!build) return;
    await fetch("/api/pt/section", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: build.sessionId, section: { index: si, answers, elapsedSec } }) });
    setTimedAnswers((t) => ({ ...t, ...Object.fromEntries(answers.map((a) => [a.questionId, a.answer])) }));
    if (si === build.breakAfter) {
      setBreakLeft(600);
      setSi(si + 1);
      setPhase("break");
      return;
    }
    if (si + 1 < build.sections.length) {
      setSi(si + 1);
      setPhase("intro");
      return;
    }
    // all sections done → BR
    const r = await fetch("/api/pt/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: build.sessionId }) });
    const data = (await r.json()) as { questions: SecQ[]; passages: SecPassage[] };
    setReviewQs(data.questions);
    setReviewPs(data.passages);
    setBrIdx(0);
    if (!data.questions.length) return finalize({});
    setPhase("br");
  }
  async function finalize(ans: Record<string, string>) {
    if (!build) return;
    const r = await fetch("/api/pt/finalize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: build.sessionId, brAnswers: ans }) });
    setFinal((await r.json()) as Final);
    setPhase("results");
    router.refresh();
  }

  if (phase === "setup") {
    return (
      <Card>
        <CardTitle>Full practice test</CardTitle>
        <CardDescription>
          Four 35-minute sections — two scored LR, one scored RC, one unscored LR or RC in a random position — with the 10-minute break after section 2, in the LawHub interface. About 2 hours 40 minutes. Then blind review, then your score.
        </CardDescription>
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-ink-2">Experimental section</p>
          <div className="flex gap-2">
            {(["random", "LR", "RC"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setExperimental(k)} className={cn("focus-ring rounded-[var(--radius)] border px-3 py-2 text-sm", experimental === k ? "border-accent bg-accent-soft" : "border-line")}>
                {k === "random" ? "Random (realistic)" : `Extra ${k}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">You won&apos;t be told which section is unscored until the results — exactly like test day.</p>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-bad">
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-ink-3">Scratch paper, water, phone off. Start at the time of day you&apos;ll actually test.</p>
          <Button size="lg" onClick={start}>
            Begin test
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "intro" && build) {
    const s = build.sections[si];
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Section {si + 1} of 4</p>
        <h2 className="mt-2 text-2xl font-semibold">{s.kind === "LR" ? "Logical Reasoning" : "Reading Comprehension"}</h2>
        <p className="mt-2 text-ink-2">
          {s.questions.length} questions · {Math.round(build.durationSec / 60)} minutes
        </p>
        <Button size="lg" className="mt-6" onClick={startNext}>
          Start section {si + 1}
        </Button>
      </Card>
    );
  }

  if (phase === "section" && build) {
    const s = build.sections[si];
    return <LawHubSection key={si} title={s.kind === "LR" ? "Logical Reasoning" : "Reading Comprehension"} sectionLabel={`Section ${si + 1} · ${s.kind === "LR" ? "Logical Reasoning" : "Reading Comprehension"}`} questions={s.questions} passages={s.passages} durationSec={build.durationSec} onSubmit={onSectionSubmit} />;
  }

  if (phase === "break") {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Intermission</p>
        <h2 className="mt-2 text-2xl font-semibold">10-minute break</h2>
        <p className="mt-4 font-mono text-5xl tabular-nums" data-testid="break-timer">
          {Math.floor(breakLeft / 60)}:{String(breakLeft % 60).padStart(2, "0")}
        </p>
        <p className="mt-3 text-sm text-ink-2">Stand up, water, bathroom. Don&apos;t think about section 2. Section 3 starts automatically when the clock hits zero.</p>
        <Button variant="outline" className="mt-5" onClick={startNext}>
          Skip break
        </Button>
      </Card>
    );
  }

  if (phase === "br") {
    const q = reviewQs[brIdx];
    const p = q?.passageId ? reviewPs.find((x) => x.id === q.passageId) : undefined;
    const answered = reviewQs.filter((x) => brAnswers[x.id]).length;
    return (
      <div className="space-y-4">
        <Card className="border-accent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Blind review · {reviewQs.length} to reconsider</CardTitle>
              <CardDescription>Flagged and blank questions from the scored sections, untimed, no answers shown. Your timed score is locked.</CardDescription>
            </div>
            <Badge tone="accent">
              {answered}/{reviewQs.length}
            </Badge>
          </div>
        </Card>
        {q && (
          <div className={cn("grid gap-4", (p || q.stimulus) && "lg:grid-cols-2")}>
            {(p || q.stimulus) && (
              <Card>
                {p ? (
                  <>
                    <p className="mb-2 text-sm font-medium">{p.title}</p>
                    {p.paragraphs.map((x, i) => (
                      <p key={i} className="lsat-text mb-3 text-[15px]">
                        {x}
                      </p>
                    ))}
                    {p.paragraphsB && (
                      <>
                        <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Passage B</p>
                        {p.paragraphsB.map((x, i) => (
                          <p key={i} className="lsat-text mb-3 text-[15px]">
                            {x}
                          </p>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <p className="lsat-text whitespace-pre-line">{q.stimulus}</p>
                )}
              </Card>
            )}
            <Card>
              <p className="mb-2 text-xs text-ink-3">
                {brIdx + 1} of {reviewQs.length} · timed answer: {timedAnswers[q.id] ?? "blank"}
              </p>
              <p className="lsat-text font-medium">{q.stem}</p>
              <ol className="mt-3 space-y-2" aria-label="Answer choices">
                {LETTERS.map((l) => (
                  <li key={l}>
                    <button type="button" onClick={() => setBrAnswers((b) => ({ ...b, [q.id]: l }))} aria-pressed={brAnswers[q.id] === l} className={cn("focus-ring flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left", brAnswers[q.id] === l ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}>
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-semibold">{l}</span>
                      <span className="lsat-text text-[15px]">{q.choices?.[l]}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setBrIdx((i) => Math.max(0, i - 1))} disabled={brIdx === 0}>
                  ← Previous
                </Button>
                {brIdx < reviewQs.length - 1 ? (
                  <Button size="sm" onClick={() => setBrIdx((i) => i + 1)}>
                    Next →
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => finalize(brAnswers)} disabled={answered < reviewQs.length}>
                    {answered < reviewQs.length ? `Answer all ${reviewQs.length} to finish` : "Finish blind review"}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (phase === "results" && final && build) {
    const gapInfo = interpretBrGap(final.brScaled - final.timedScaled);
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Timed score" value={String(final.timedScaled)} sub={`${final.timedRaw}/${final.total} · ${percentile(final.timedScaled)}th pct`} />
          <Stat label="Blind review" value={String(final.brScaled)} sub={`${final.brRaw}/${final.total}`} />
          <Stat label="BR gap" value={`${final.brScaled - final.timedScaled >= 0 ? "+" : ""}${final.brScaled - final.timedScaled}`} sub={`${final.gap} questions`} />
          <Stat label="Blind spots" value={String(final.blindSpots)} sub="confident and wrong" />
        </div>
        <Card className="border-accent">
          <CardTitle>{gapInfo.label}</CardTitle>
          <p className="mt-1 text-sm text-ink-2">{gapInfo.advice}</p>
        </Card>
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Section</th>
                <th className="px-4 py-2 font-medium">Scored</th>
                <th className="px-4 py-2 font-medium">Timed</th>
                <th className="px-4 py-2 font-medium">BR</th>
                <th className="px-4 py-2 font-medium">Time used</th>
              </tr>
            </thead>
            <tbody>
              {final.perSection.map((s) => (
                <tr key={s.index} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2">
                    {s.index + 1} · {s.kind === "LR" ? "Logical Reasoning" : "Reading Comprehension"}
                  </td>
                  <td className="px-4 py-2">{s.scored ? <Badge tone="ok">scored</Badge> : <Badge tone="neutral">experimental</Badge>}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {s.correct}/{s.n}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{s.scored ? `${s.br}/${s.n}` : "—"}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {Math.floor(s.seconds / 60)}:{String(s.seconds % 60).padStart(2, "0")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/review">Review the misses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/analytics">Score trend</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (phase === "error") return <p className="text-bad">{error}</p>;
  return <p className="text-ink-2">Loading…</p>;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-ink-3">{sub}</p>
    </Card>
  );
}
