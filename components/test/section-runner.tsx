"use client";

/**
 * Timed section runner with blind review.
 *
 * Phases: setup → running (LawHub-style shell: timer, question bar, flag, highlight)
 *         → blind review (flagged + blank reopen untimed, no keys shown)
 *         → results (timed score, BR score, gap, per-question outcomes, pacing).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { LawHubSection, type SecAnswer, type SecPassage } from "./lawhub-section";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";
import { typeLabel } from "@/lib/content/labels";
import { SECTION_PRESETS } from "@/lib/engine/section";
import { interpretBrGap } from "@/lib/scoring/range";
import { pacingCurve, timeBleeds } from "@/lib/engine/pacing";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

type Q = { id: string; type: string; difficulty: number; stimulus: string | null; stem: string | null; choices: Record<string, string> | null; passageId?: string | null };
type Answer = { answer: string | null; seconds: number; flagged: boolean; changedFrom: string | null; eliminated: string[] };

type Phase = "setup" | "running" | "submitting" | "br" | "results";

export function SectionRunner({ bankCount, kind = "LR", lessonId, presetN, presetMinutes }: { bankCount: number; kind?: "LR" | "RC"; lessonId?: string | null; presetN?: number; presetMinutes?: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [durationSec, setDurationSec] = useState<number>((presetMinutes ?? 35) * 60);
  const [n, setN] = useState(presetN ?? 25);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [passages, setPassages] = useState<SecPassage[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [error, setError] = useState<string | null>(null);
  const [reviewQs, setReviewQs] = useState<Q[]>([]);
  const [reviewPs, setReviewPs] = useState<SecPassage[]>([]);
  const [brAnswers, setBrAnswers] = useState<Record<string, string>>({});
  const [brIdx, setBrIdx] = useState(0);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [timedRaw, setTimedRaw] = useState<number | null>(null);

  async function start() {
    setError(null);
    const res = await fetch("/api/section/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: kind, n, durationSec }) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `Could not start (${res.status})`);
      return;
    }
    const data = (await res.json()) as { sessionId: string; questions: Q[]; passages?: SecPassage[] };
    setSessionId(data.sessionId);
    setQs(data.questions);
    setPassages(data.passages ?? []);
    setPhase("running");
  }

  async function onSectionSubmit(secAnswers: SecAnswer[], elapsed: number) {
    setPhase("submitting");
    const map: Record<string, Answer> = {};
    for (const a of secAnswers) map[a.questionId] = { answer: a.answer, seconds: a.seconds, flagged: a.flagged, changedFrom: a.changedFrom, eliminated: [] };
    setAnswers(map);
    const res = await fetch("/api/section/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, answers: secAnswers, elapsedSec: elapsed }) });
    const data = (await res.json()) as { timedRaw: number; toReview: string[]; reviewQuestions: Q[]; reviewPassages: SecPassage[] };
    setTimedRaw(data.timedRaw);
    setReviewQs(data.reviewQuestions);
    setReviewPs(data.reviewPassages ?? []);
    setBrAnswers(Object.fromEntries(data.reviewQuestions.map((q) => [q.id, map[q.id]?.answer ?? ""]).filter(([, v]) => v)));
    setBrIdx(0);
    setPhase(data.reviewQuestions.length ? "br" : "results");
    if (!data.reviewQuestions.length) await finishBr({});
  }

  async function finishBr(ans: Record<string, string>) {
    const res = await fetch("/api/section/br", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, brAnswers: ans }) });
    const data = (await res.json()) as ResultsPayload;
    setResults(data);
    setPhase("results");
    // A lesson check (Unit 5 timed sets): 70% timed accuracy completes the lesson.
    if (lessonId) {
      await fetch("/api/lessons/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, score: data.timedRaw, total: data.n, threshold: 0.7 }) });
    }
    router.refresh();
  }

  /* ---------------- setup ---------------- */
  if (phase === "setup") {
    return (
      <Card>
        <CardTitle>Timed {kind === "RC" ? "RC" : "LR"} section</CardTitle>
        <CardDescription>
          {kind === "RC" ? "Four passages (one comparative when available), 26–28 questions, in test order." : `${n} questions assembled to the real test\u2019s type mix and difficulty curve.`} Flag anything you&apos;re not certain of — after you submit, flagged and blank questions reopen untimed for blind review before you see a single answer.
        </CardDescription>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-2">Time</p>
            <div className="flex flex-col gap-2">
              {SECTION_PRESETS.map((p) => (
                <button key={p.seconds} type="button" onClick={() => setDurationSec(p.seconds)} className={cn("focus-ring rounded-[var(--radius)] border px-3 py-2 text-left text-sm", durationSec === p.seconds ? "border-accent bg-accent-soft" : "border-line")}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-2">Length</p>
            <div className="flex gap-2">
              {(kind === "RC" ? [] : [24, 25, 26]).map((k) => (
                <button key={k} type="button" onClick={() => setN(k)} className={cn("focus-ring h-10 flex-1 rounded-[var(--radius)] border text-sm", n === k ? "border-accent bg-accent-soft" : "border-line")}>
                  {k}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">{bankCount} {kind === "RC" ? "passages" : "questions"} in the bank. Each section avoids anything you&apos;ve seen in the last 60 days.</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-bad">
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-ink-3">Before you start: no notes, no pausing, phone away. Treat it like the real thing.</p>
          <Button size="lg" onClick={start}>
            Start section
          </Button>
        </div>
      </Card>
    );
  }

  /* ---------------- running ---------------- */
  if (phase === "running" && qs.length) {
    return <LawHubSection title={kind === "RC" ? "Reading Comprehension" : "Logical Reasoning"} sectionLabel={`Section 1 · ${kind === "RC" ? "Reading Comprehension" : "Logical Reasoning"}`} questions={qs} passages={passages} durationSec={durationSec} onSubmit={onSectionSubmit} />;
  }

  if (phase === "submitting") return <p className="text-ink-2">Scoring…</p>;

  /* ---------------- blind review ---------------- */
  if (phase === "br") {
    const q = reviewQs[brIdx];
    const answered = Object.keys(brAnswers).filter((k) => brAnswers[k]).length;
    return (
      <div className="space-y-4">
        <Card className="border-accent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Blind review · {reviewQs.length} to reconsider</CardTitle>
              <CardDescription>Untimed, no answers shown yet. For each flagged or blank question, work it from scratch and commit to your best answer. Your timed score is locked; this measures what you know when the clock isn&apos;t running.</CardDescription>
            </div>
            <Badge tone="accent">
              {answered}/{reviewQs.length}
            </Badge>
          </div>
        </Card>
        {q && (
          <Card>
            {q.passageId && reviewPs.find((p) => p.id === q.passageId) && (
              <details className="mb-3 rounded-md border border-line p-3" open data-testid="passage-pane">
                <summary className="cursor-pointer text-sm font-medium">{reviewPs.find((p) => p.id === q.passageId)!.title}</summary>
                {reviewPs.find((p) => p.id === q.passageId)!.paragraphs.map((x, i) => (
                  <p key={i} className="lsat-text mt-2 text-[15px]">{x}</p>
                ))}
                {reviewPs.find((p) => p.id === q.passageId)!.paragraphsB?.map((x, i) => (
                  <p key={`b${i}`} className="lsat-text mt-2 text-[15px]">{i === 0 ? <span className="mr-2 text-[11px] font-semibold uppercase text-ink-3">Passage B</span> : null}{x}</p>
                ))}
              </details>
            )}
            <div className="mb-2 flex items-center gap-2 text-xs text-ink-3">
              <Badge>{typeLabel(q.type)}</Badge>
              <span>
                {brIdx + 1} of {reviewQs.length}
              </span>
              <span>· timed answer: {answers[q.id]?.answer ?? "blank"}</span>
            </div>
            {q.stimulus && <p className="lsat-text whitespace-pre-line">{q.stimulus}</p>}
            <p className="lsat-text mt-4 font-medium">{q.stem}</p>
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
                <Button size="sm" onClick={() => finishBr(brAnswers)} disabled={answered < reviewQs.length}>
                  {answered < reviewQs.length ? `Answer all ${reviewQs.length} to finish` : "Finish blind review"}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  /* ---------------- results ---------------- */
  if (phase === "results" && results) {
    return <SectionResults results={results} qs={qs} answers={answers} timedRaw={timedRaw ?? results.timedRaw} durationSec={durationSec} />;
  }
  return null;
}

type ResultsPayload = {
  n: number;
  timedRaw: number;
  brRaw: number;
  gap: number;
  flagged: number;
  recovered: number;
  stuck: number;
  blindSpots: number;
  timedScaled: number;
  brScaled: number;
  items: { questionId: string; key: string | null; timedAnswer: string | null; flagged: boolean; brFinal: string | null; timedCorrect: boolean | null; brCorrect: boolean | null; outcome: string }[];
};

const OUTCOME: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "neutral" | "info" }> = {
  right_right: { label: "Right", tone: "ok" },
  wrong_right: { label: "Recovered in BR", tone: "info" },
  blank_right: { label: "Blank → right in BR", tone: "info" },
  wrong_wrong: { label: "Still wrong", tone: "bad" },
  blank_wrong: { label: "Blank → wrong", tone: "bad" },
  right_wrong: { label: "Talked yourself out of it", tone: "warn" },
  unreviewed_miss: { label: "Blind spot", tone: "bad" },
};

function SectionResults({ results, qs, answers, durationSec }: { results: ResultsPayload; qs: Q[]; answers: Record<string, Answer>; timedRaw: number; durationSec: number }) {
  const gapInfo = interpretBrGap(results.brScaled - results.timedScaled);
  const secs = qs.map((q) => answers[q.id]?.seconds ?? 0);
  const curve = useMemo(() => pacingCurve(secs, durationSec), [secs, durationSec]);
  const bleeds = useMemo(() => new Set(timeBleeds(secs)), [secs]);
  const maxDelta = Math.max(60, ...curve.map((c) => Math.abs(c.deltaSec)));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Timed" value={`${results.timedRaw}/${results.n}`} sub={`≈ ${results.timedScaled} scaled`} />
        <Stat label="Blind review" value={`${results.brRaw}/${results.n}`} sub={`≈ ${results.brScaled} scaled`} />
        <Stat label="BR gap" value={`${results.gap >= 0 ? "+" : ""}${results.gap}`} sub={`${results.brScaled - results.timedScaled >= 0 ? "+" : ""}${results.brScaled - results.timedScaled} scaled`} />
        <Stat label="Blind spots" value={String(results.blindSpots)} sub="confident and wrong" />
      </div>
      <Card className="border-accent">
        <CardTitle>{gapInfo.label}</CardTitle>
        <p className="mt-1 text-sm text-ink-2">{gapInfo.advice}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="info">{results.recovered} recovered in BR → timing</Badge>
          <Badge tone="bad">{results.stuck} still wrong → content</Badge>
          <Badge tone="warn">{results.items.filter((i) => i.outcome === "right_wrong").length} switched off the key</Badge>
        </div>
      </Card>

      {/* Pacing */}
      <Card>
        <CardTitle>Pacing vs target</CardTitle>
        <CardDescription>Bar height is how far off the checkpoint pace you were after each question. Green = ahead, amber = behind, red = a time bleed (over 2× your median on one question).</CardDescription>
        <div className="mt-3 flex h-28 items-end gap-[2px]" role="img" aria-label="Pacing chart">
          {curve.map((c) => {
            const h = Math.round((Math.abs(c.deltaSec) / maxDelta) * 50);
            const behind = c.deltaSec > 0;
            return (
              <div key={c.index} className="flex flex-1 flex-col items-center justify-end" title={`Q${c.index + 1}: ${Math.round(secs[c.index])}s · ${behind ? "+" : ""}${Math.round(c.deltaSec)}s vs target`}>
                <div className={cn("w-full rounded-t", behind ? (bleeds.has(c.index) ? "bg-bad" : "bg-warn") : "bg-ok")} style={{ height: `${h + 4}px` }} />
                <span className="mt-1 text-[9px] text-ink-3">{(c.index + 1) % 5 === 0 ? c.index + 1 : ""}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-3">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Lvl</th>
              <th className="px-3 py-2 font-medium">Timed</th>
              <th className="px-3 py-2 font-medium">BR</th>
              <th className="px-3 py-2 font-medium">Key</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {results.items.map((it, i) => {
              const q = qs.find((x) => x.id === it.questionId);
              const o = OUTCOME[it.outcome] ?? { label: it.outcome, tone: "neutral" as const };
              return (
                <tr key={it.questionId} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 tabular-nums text-ink-3">{i + 1}</td>
                  <td className="px-3 py-2">{q ? typeLabel(q.type) : ""}</td>
                  <td className="px-3 py-2">L{q?.difficulty}</td>
                  <td className={cn("px-3 py-2", it.timedCorrect ? "text-ok" : "text-bad")}>
                    {it.timedAnswer ?? "—"}
                    {it.flagged && <Flag className="ml-1 inline h-3 w-3 text-accent" />}
                  </td>
                  <td className={cn("px-3 py-2", it.brCorrect ? "text-ok" : "text-bad")}>{it.brFinal ?? "—"}</td>
                  <td className="px-3 py-2">{it.key}</td>
                  <td className={cn("px-3 py-2 tabular-nums", bleeds.has(i) && "text-bad")}>{Math.round(secs[i])}s</td>
                  <td className="px-3 py-2">
                    <Badge tone={o.tone}>{o.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/review">Review the misses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/test">Another section</Link>
        </Button>
      </div>
    </div>
  );
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
