"use client";

/**
 * Skip trainer: a 35-minute LR section where every question opens with a
 * 10-second triage gate — "attempt" or "skip" — before the choices appear.
 * Skipped questions queue for a return pass. The result scores the decisions
 * against the goal's skip policy, not just the answers.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { typeLabel } from "@/lib/content/labels";
import { scoreSkipDecisions, type SkipScore } from "@/lib/engine/skip-policy";
import { cn } from "@/lib/ui/cn";

const LETTERS = ["A", "B", "C", "D", "E"] as const;
type Q = { id: string; type: string; difficulty: number; stimulus: string | null; stem: string | null; choices: Record<string, string> | null };
type Rec = { skippedFirstPass: boolean; answer: string | null; seconds: number; triageSeconds: number };
type Phase = "setup" | "first" | "return" | "scoring" | "results";

export function SkipTrainer({ goal, bankCount }: { goal: number; bankCount: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [order, setOrder] = useState<number[]>([]); // indexes for the current pass
  const [pos, setPos] = useState(0);
  const [rec, setRec] = useState<Record<string, Rec>>({});
  const [gate, setGate] = useState<"deciding" | "attempting">("deciding");
  const [gateLeft, setGateLeft] = useState(10);
  const [remaining, setRemaining] = useState(35 * 60);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<(SkipScore & { correct: number; n: number }) | null>(null);
  const recRef = useRef<Record<string, Rec>>({});
  const startedAt = useRef(Date.now());
  const qEntered = useRef(Date.now());
  const gateEntered = useRef(Date.now());
  const submitted = useRef(false);

  const qi = order[pos];
  const cur = qi != null ? qs[qi] : undefined;

  useEffect(() => {
    if (phase !== "first" && phase !== "return") return;
    const t = setInterval(() => {
      const left = 35 * 60 - Math.floor((Date.now() - startedAt.current) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) void finishAll();
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "first" || gate !== "deciding") return;
    gateEntered.current = Date.now();
    setGateLeft(10);
    const t = setInterval(() => {
      const left = 10 - Math.floor((Date.now() - gateEntered.current) / 1000);
      setGateLeft(Math.max(0, left));
      if (left <= 0) decide("attempt"); // indecision = attempt (that's the realistic default failure)
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gate, pos]);

  async function start() {
    setError(null);
    const res = await fetch("/api/section/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: "LR", n: 25, durationSec: 35 * 60, kind: "skip_trainer" }) });
    if (!res.ok) {
      setError("Not enough questions in the bank for a full section.");
      return;
    }
    const data = (await res.json()) as { sessionId: string; questions: Q[] };
    setSessionId(data.sessionId);
    setQs(data.questions);
    setOrder(data.questions.map((_, i) => i));
    recRef.current = Object.fromEntries(data.questions.map((q) => [q.id, { skippedFirstPass: false, answer: null, seconds: 0, triageSeconds: 0 }]));
    setRec(recRef.current);
    setPos(0);
    setGate("deciding");
    startedAt.current = Date.now();
    qEntered.current = Date.now();
    setPhase("first");
  }

  function patch(id: string, f: (r: Rec) => Rec) {
    recRef.current = { ...recRef.current, [id]: f(recRef.current[id]) };
    setRec(recRef.current);
  }

  function decide(d: "attempt" | "skip") {
    if (!cur) return;
    const triage = (Date.now() - gateEntered.current) / 1000;
    if (d === "skip") {
      patch(cur.id, (r) => ({ ...r, skippedFirstPass: true, triageSeconds: triage, seconds: r.seconds + triage }));
      advance();
    } else {
      patch(cur.id, (r) => ({ ...r, triageSeconds: triage }));
      qEntered.current = Date.now();
      setGate("attempting");
    }
  }

  function answer(l: string) {
    if (!cur) return;
    const dt = (Date.now() - qEntered.current) / 1000;
    patch(cur.id, (r) => ({ ...r, answer: l, seconds: r.seconds + dt + (phase === "first" ? r.triageSeconds : 0) }));
    advance();
  }

  function advance() {
    if (pos + 1 < order.length) {
      setPos(pos + 1);
      setGate("deciding");
      qEntered.current = Date.now();
      return;
    }
    if (phase === "first") {
      const list = qs.map((q, i) => (recRef.current[q.id]?.skippedFirstPass && !recRef.current[q.id]?.answer ? i : -1)).filter((i) => i >= 0);
      if (list.length) {
        setOrder(list);
        setPos(0);
        setGate("attempting");
        qEntered.current = Date.now();
        setPhase("return");
        return;
      }
    }
    void finishAll();
  }

  async function finishAll() {
    if (submitted.current) return;
    submitted.current = true;
    setPhase("scoring");
    const R = recRef.current;
    const answers = qs.map((q) => ({ questionId: q.id, answer: R[q.id]?.answer ?? null, seconds: Math.round((R[q.id]?.seconds ?? 0) * 10) / 10, flagged: R[q.id]?.skippedFirstPass ?? false, changedFrom: null }));
    const res = await fetch("/api/section/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, answers, elapsedSec: Math.floor((Date.now() - startedAt.current) / 1000) }) });
    await res.json();
    // finalize the session without a BR pass (skip trainer is about decisions); fetch keys via BR endpoint with no changes
    const br = await fetch("/api/section/br", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, brAnswers: {} }) });
    const data = (await br.json()) as { items: { questionId: string; timedCorrect: boolean | null }[]; timedRaw: number; n: number };
    const correctById = new Map(data.items.map((i) => [i.questionId, i.timedCorrect]));
    const s = scoreSkipDecisions(
      qs.map((q) => ({ questionId: q.id, difficulty: q.difficulty, skippedFirstPass: R[q.id]?.skippedFirstPass ?? false, seconds: R[q.id]?.seconds ?? 0, correct: correctById.get(q.id) ?? null })),
      goal,
    );
    setScore({ ...s, correct: data.timedRaw, n: data.n });
    setPhase("results");
    router.refresh();
  }

  if (phase === "setup") {
    return (
      <Card>
        <CardTitle>Skip trainer</CardTitle>
        <CardDescription>
          A full timed LR section with one change: every question opens with a 10-second triage gate. Decide <strong>attempt</strong> or <strong>skip</strong> before you see the choices. Skips queue for a return pass. You&apos;re scored on the decisions — time bleeds, skipped gimmes, skip count against your goal ({goal}: {goalPolicy(goal)}) — not just on accuracy.
        </CardDescription>
        <p className="mt-3 text-xs text-ink-3">{bankCount} questions in the bank. If you don&apos;t decide within 10 seconds, it counts as an attempt — indecision is the real-world failure mode.</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <Button size="lg" onClick={start}>
            Start
          </Button>
        </div>
      </Card>
    );
  }

  if ((phase === "first" || phase === "return") && cur) {
    const mm = Math.floor(remaining / 60);
    const ss = String(remaining % 60).padStart(2, "0");
    const deciding = phase === "first" && gate === "deciding";
    return (
      <div className="-mx-4 -mt-6 flex min-h-dvh flex-col bg-bg-elev md:-mx-8" data-testid="skip-shell">
        <div className="flex items-center justify-between border-b border-line bg-bg-sunken px-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{phase === "first" ? "First pass" : "Return pass"}</span>
            <span className="text-ink-3">
              Question {qi! + 1} · {pos + 1} of {order.length} in this pass
            </span>
            <Badge tone="neutral">{typeLabel(cur.type)}</Badge>
          </div>
          <span className={cn("font-mono tabular-nums", remaining <= 300 && "font-semibold text-bad")}>
            {mm}:{ss}
          </span>
        </div>
        <div className="grid flex-1 lg:grid-cols-2">
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
            <p className="lsat-text whitespace-pre-line">{cur.stimulus}</p>
            <p className="lsat-text mt-4 font-medium">{cur.stem}</p>
          </div>
          <div className="p-5">
            {deciding ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-ink-2">Do you see the structure? Decide.</p>
                <p className="font-mono text-4xl tabular-nums" data-testid="gate-timer">
                  {gateLeft}
                </p>
                <div className="flex gap-3">
                  <Button size="lg" onClick={() => decide("attempt")}>
                    Attempt now
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => decide("skip")}>
                    Skip, come back
                  </Button>
                </div>
                <p className="max-w-sm text-xs text-ink-3">Skip if the stimulus is dense, the type is one you&apos;re slow on, or you&apos;d need a diagram. Attempt if you already see the gap.</p>
              </div>
            ) : (
              <ol className="space-y-2" aria-label="Answer choices">
                {LETTERS.map((l) => (
                  <li key={l}>
                    <button type="button" onClick={() => answer(l)} className="focus-ring flex w-full items-start gap-3 rounded-md border border-line px-3 py-2.5 text-left hover:border-line-strong">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-xs font-semibold">{l}</span>
                      <span className="lsat-text text-[15px]">{cur.choices?.[l]}</span>
                    </button>
                  </li>
                ))}
                {phase === "return" && (
                  <li className="pt-2">
                    <Button variant="ghost" size="sm" onClick={() => advance()}>
                      Leave blank and move on
                    </Button>
                  </li>
                )}
              </ol>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "scoring") return <p className="text-ink-2">Scoring your decisions…</p>;

  if (phase === "results" && score) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Accuracy" value={`${score.correct}/${score.n}`} sub="timed" />
          <Stat label="Skips" value={String(score.skips)} sub={`policy ${score.recommendedSkips[0]}–${score.recommendedSkips[1]} for ${goal}`} />
          <Stat label="Time bleeds" value={String(score.timeBleeds)} sub="long and wrong" />
          <Stat label="Decision score" value={`${score.total > 0 ? "+" : ""}${score.total}`} sub="clean attempts & good skips" />
        </div>
        <Card className="border-accent">
          <CardTitle>Verdict</CardTitle>
          <p className="mt-1 text-sm text-ink-2">{score.summary}</p>
        </Card>
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Lvl</th>
                <th className="px-3 py-2 font-medium">Decision</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {qs.map((q, i) => {
                const p = score.perQuestion.find((x) => x.questionId === q.id)!;
                const r = rec[q.id];
                return (
                  <tr key={q.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 tabular-nums text-ink-3">{i + 1}</td>
                    <td className="px-3 py-2">{typeLabel(q.type)}</td>
                    <td className="px-3 py-2">L{q.difficulty}</td>
                    <td className="px-3 py-2">{r?.skippedFirstPass ? <Badge tone="info">skipped</Badge> : <Badge tone="neutral">attempted</Badge>}</td>
                    <td className="px-3 py-2 tabular-nums">{Math.round(r?.seconds ?? 0)}s</td>
                    <td className="px-3 py-2">
                      <Badge tone={p.points > 0 ? "ok" : p.points < 0 ? "bad" : "neutral"}>{p.verdict}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/test/skip-trainer">Run it again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/review">Review the misses</Link>
          </Button>
        </div>
      </div>
    );
  }
  return null;
}

function goalPolicy(goal: number) {
  const [a, b] = goal >= 175 ? [0, 2] : goal >= 170 ? [2, 4] : [3, 5];
  return `${a}–${b} skips per section`;
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
