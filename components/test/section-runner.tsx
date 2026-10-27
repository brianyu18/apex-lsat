"use client";

/**
 * Timed section runner with blind review.
 *
 * Phases: setup → running (LawHub-style shell: timer, question bar, flag, highlight)
 *         → blind review (flagged + blank reopen untimed, no keys shown)
 *         → results (timed score, BR score, gap, per-question outcomes, pacing).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";
import { typeLabel } from "@/lib/content/labels";
import { SECTION_PRESETS } from "@/lib/engine/section";
import { interpretBrGap } from "@/lib/scoring/range";
import { pacingCurve, timeBleeds } from "@/lib/engine/pacing";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

type Q = { id: string; type: string; difficulty: number; stimulus: string | null; stem: string | null; choices: Record<string, string> | null };
type Answer = { answer: string | null; seconds: number; flagged: boolean; changedFrom: string | null; eliminated: string[] };

type Phase = "setup" | "running" | "submitting" | "br" | "results";

export function SectionRunner({ bankCount }: { bankCount: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [durationSec, setDurationSec] = useState<number>(35 * 60);
  const [n, setN] = useState(25);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [hideTimer, setHideTimer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enteredAt = useRef<number>(Date.now());
  const startedAt = useRef<number>(Date.now());
  const [reviewQs, setReviewQs] = useState<Q[]>([]);
  const [brAnswers, setBrAnswers] = useState<Record<string, string>>({});
  const [brIdx, setBrIdx] = useState(0);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [timedRaw, setTimedRaw] = useState<number | null>(null);

  const cur = qs[idx];

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      const left = durationSec - Math.floor((Date.now() - startedAt.current) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) void submit(true);
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, durationSec]);

  // Track time on each question
  const commitTime = useCallback(() => {
    if (!cur) return;
    const dt = (Date.now() - enteredAt.current) / 1000;
    setAnswers((a) => ({ ...a, [cur.id]: { ...(a[cur.id] ?? blank()), seconds: (a[cur.id]?.seconds ?? 0) + dt } }));
    enteredAt.current = Date.now();
  }, [cur]);

  function go(i: number) {
    commitTime();
    setIdx(Math.max(0, Math.min(qs.length - 1, i)));
  }

  async function start() {
    setError(null);
    const res = await fetch("/api/section/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: "LR", n, durationSec }) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `Could not start (${res.status})`);
      return;
    }
    const data = (await res.json()) as { sessionId: string; questions: Q[] };
    setSessionId(data.sessionId);
    setQs(data.questions);
    setAnswers(Object.fromEntries(data.questions.map((q) => [q.id, blank()])));
    setIdx(0);
    startedAt.current = Date.now();
    enteredAt.current = Date.now();
    setRemaining(durationSec);
    setPhase("running");
  }

  async function submit(auto = false) {
    if (phase !== "running") return;
    if (!auto) {
      const unanswered = qs.filter((q) => !answers[q.id]?.answer).length;
      if (unanswered > 0 && !confirm(`${unanswered} unanswered. Submit anyway? (Blanks score zero — guess first.)`)) return;
    }
    commitTime();
    setPhase("submitting");
    const payload = qs.map((q) => {
      const a = answers[q.id] ?? blank();
      return { questionId: q.id, answer: a.answer, seconds: Math.round(a.seconds * 10) / 10, flagged: a.flagged, changedFrom: a.changedFrom };
    });
    // include the time on the current question
    const curA = answers[cur?.id ?? ""];
    if (cur && curA) payload[idx].seconds = Math.round((curA.seconds + (Date.now() - enteredAt.current) / 1000) * 10) / 10;
    const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
    const res = await fetch("/api/section/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, answers: payload, elapsedSec: elapsed }) });
    const data = (await res.json()) as { timedRaw: number; toReview: string[]; reviewQuestions: Q[] };
    setTimedRaw(data.timedRaw);
    setReviewQs(data.reviewQuestions);
    setBrAnswers(Object.fromEntries(data.reviewQuestions.map((q) => [q.id, answers[q.id]?.answer ?? ""]).filter(([, v]) => v)));
    setBrIdx(0);
    setPhase(data.reviewQuestions.length ? "br" : "results");
    if (!data.reviewQuestions.length) await finishBr({});
  }

  async function finishBr(ans: Record<string, string>) {
    const res = await fetch("/api/section/br", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, brAnswers: ans }) });
    const data = (await res.json()) as ResultsPayload;
    setResults(data);
    setPhase("results");
    router.refresh();
  }

  /* ---------------- setup ---------------- */
  if (phase === "setup") {
    return (
      <Card>
        <CardTitle>Timed LR section</CardTitle>
        <CardDescription>
          {n} questions assembled to the real test&apos;s type mix and difficulty curve. Flag anything you&apos;re not certain of — after you submit, flagged and blank questions reopen untimed for blind review before you see a single answer.
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
              {[24, 25, 26].map((k) => (
                <button key={k} type="button" onClick={() => setN(k)} className={cn("focus-ring h-10 flex-1 rounded-[var(--radius)] border text-sm", n === k ? "border-accent bg-accent-soft" : "border-line")}>
                  {k}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">{bankCount} questions in the bank. Each section avoids anything you&apos;ve seen in the last 60 days.</p>
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
  if (phase === "running" && cur) {
    const a = answers[cur.id] ?? blank();
    const mm = Math.floor(remaining / 60);
    const ss = String(remaining % 60).padStart(2, "0");
    const lastFive = remaining <= 300;
    return (
      <div className="-mx-4 -mt-6 flex min-h-dvh flex-col bg-bg-elev md:-mx-8" data-testid="section-shell">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-line bg-bg-sunken px-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Section 1 · Logical Reasoning</span>
            <span className="text-ink-3">
              Question {idx + 1} of {qs.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => !lastFive && setHideTimer((h) => !h)} className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-ink-2 hover:bg-bg-elev" aria-label={hideTimer ? "Show timer" : "Hide timer"} title={lastFive ? "Timer can't be hidden in the last 5 minutes" : ""}>
              {hideTimer && !lastFive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <span className={cn("font-mono tabular-nums", lastFive && "font-semibold text-bad")} aria-live={lastFive ? "polite" : "off"} data-testid="timer">
              {hideTimer && !lastFive ? "––:––" : `${mm}:${ss}`}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="grid flex-1 gap-0 lg:grid-cols-2">
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <p className="lsat-text whitespace-pre-line">{cur.stimulus}</p>
          </div>
          <div className="p-5">
            <p className="lsat-text font-medium">{cur.stem}</p>
            <ol className="mt-4 space-y-2" aria-label="Answer choices">
              {LETTERS.map((l) => {
                const sel = a.answer === l;
                const struck = a.eliminated.includes(l);
                return (
                  <li key={l} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => {
                          const p = prev[cur.id] ?? blank();
                          const changedFrom = p.answer && p.answer !== l ? (p.changedFrom ?? p.answer) : p.changedFrom;
                          return { ...prev, [cur.id]: { ...p, answer: l, changedFrom, eliminated: p.eliminated.filter((x) => x !== l) } };
                        })
                      }
                      aria-pressed={sel}
                      className={cn("focus-ring flex flex-1 items-start gap-3 rounded-md border px-3 py-2.5 text-left", sel ? "border-ink bg-bg-sunken" : "border-line hover:border-line-strong", struck && "line-through opacity-50")}
                    >
                      <span className={cn("mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", sel ? "border-ink bg-ink text-bg" : "border-line-strong")}>{l}</span>
                      <span className="lsat-text text-[15px]">{cur.choices?.[l]}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => { const p = prev[cur.id] ?? blank(); return { ...prev, [cur.id]: { ...p, eliminated: struck ? p.eliminated.filter((x) => x !== l) : [...p.eliminated, l] } }; })}
                      className="focus-ring w-7 shrink-0 rounded-md text-xs text-ink-3 hover:bg-bg-sunken"
                      aria-label={`${struck ? "Restore" : "Eliminate"} ${l}`}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex items-center gap-2">
              <Button variant={a.flagged ? "secondary" : "outline"} size="sm" onClick={() => setAnswers((prev) => ({ ...prev, [cur.id]: { ...(prev[cur.id] ?? blank()), flagged: !(prev[cur.id]?.flagged ?? false) } }))} aria-pressed={a.flagged}>
                <Flag className={cn("h-4 w-4", a.flagged && "fill-current")} /> {a.flagged ? "Flagged for review" : "Flag for review"}
              </Button>
              {a.answer && (
                <Button variant="ghost" size="sm" onClick={() => setAnswers((prev) => ({ ...prev, [cur.id]: { ...(prev[cur.id] ?? blank()), answer: null } }))}>
                  Reset response
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar: question navigator */}
        <div className="sticky bottom-0 border-t border-line bg-bg-sunken px-3 py-2" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous question">
              <ChevronLeft />
            </Button>
            <ol className="flex flex-1 flex-wrap justify-center gap-1" aria-label="Question navigator">
              {qs.map((q, i) => {
                const qa = answers[q.id];
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Question ${i + 1}${qa?.answer ? ", answered" : ""}${qa?.flagged ? ", flagged" : ""}`}
                      aria-current={i === idx ? "true" : undefined}
                      className={cn(
                        "focus-ring relative h-7 w-7 rounded text-[11px] font-medium tabular-nums",
                        i === idx ? "bg-ink text-bg" : qa?.answer ? "bg-line text-ink" : "border border-line text-ink-3",
                      )}
                    >
                      {i + 1}
                      {qa?.flagged && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ol>
            {idx < qs.length - 1 ? (
              <Button size="sm" onClick={() => go(idx + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => submit(false)}>
                Submit section
              </Button>
            )}
          </div>
        </div>
      </div>
    );
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
            <div className="mb-2 flex items-center gap-2 text-xs text-ink-3">
              <Badge>{typeLabel(q.type)}</Badge>
              <span>
                {brIdx + 1} of {reviewQs.length}
              </span>
              <span>· timed answer: {answers[q.id]?.answer ?? "blank"}</span>
            </div>
            <p className="lsat-text whitespace-pre-line">{q.stimulus}</p>
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

function blank(): Answer {
  return { answer: null, seconds: 0, flagged: false, changedFrom: null, eliminated: [] };
}

