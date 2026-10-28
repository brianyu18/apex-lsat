"use client";

/**
 * RC drill: one passage at a time. Read (timed separately) → questions in
 * order using the same QuestionCard as LR → passage summary → next passage.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardTitle } from "@/components/ui/primitives";
import { PassagePanel, type PassageView } from "./passage-panel";
import { QuestionCard } from "./question-card";
import { typeLabel } from "@/lib/content/labels";
import type { Confidence, SafeQuestion, SubmitResponse } from "./types";
import type { RcPickSettings } from "@/lib/data/rc";

type Phase = "loading" | "reading" | "question" | "passage_summary" | "empty" | "done";

interface RcSettings extends Partial<RcPickSettings> {
  passages: number; // 0 = endless
  predictionMode: boolean;
}

export function RcDrillSession() {
  const params = useSearchParams();
  const router = useRouter();
  const settings = useMemo<RcSettings>(() => {
    try {
      return { passages: 2, predictionMode: false, ...JSON.parse(params.get("s") ?? "{}") };
    } catch {
      return { passages: 2, predictionMode: false };
    }
  }, [params]);
  const lessonId = params.get("lesson");

  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [passage, setPassage] = useState<PassageView | null>(null);
  const [qs, setQs] = useState<SafeQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [passageSeconds, setPassageSeconds] = useState(0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [served, setServed] = useState<string[]>([]);
  const [passageResults, setPassageResults] = useState<{ id: string; type: string; correct: boolean | null; seconds: number }[]>([]);
  const [allResults, setAllResults] = useState<{ passageId: string; title: string; correct: number; total: number; passageSeconds: number; questionSeconds: number }[]>([]);
  const qStart = useRef(Date.now());
  const booted = useRef(false);

  const loadPassage = useCallback(
    async (exclude: string[]) => {
      setPhase("loading");
      setResult(null);
      setQi(0);
      setPassageResults([]);
      const res = await fetch("/api/rc/next", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings, excludePassageIds: exclude }) });
      const data = (await res.json()) as { passage: PassageView | null; questions: SafeQuestion[] };
      if (!data.passage) return setPhase("empty");
      setPassage(data.passage);
      setQs(data.questions);
      setPhase("reading");
    },
    [settings],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      const res = await fetch("/api/drill/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings: { section: "RC", ...settings }, kind: lessonId ? "check" : "drill" }) });
      const { sessionId } = (await res.json()) as { sessionId: string };
      setSessionId(sessionId);
      await loadPassage([]);
    })();
  }, [loadPassage, settings, lessonId]);

  function onReady(secs: number, pred: string | null) {
    setPassageSeconds(secs);
    setPrediction(pred);
    qStart.current = Date.now();
    setPhase("question");
  }

  async function onSubmit(payload: { answer: string; confidence: Confidence; seconds: number; prediction: string | null; changedFrom: string | null }) {
    const q = qs[qi];
    const res = await fetch("/api/drill/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: q.id,
        mode: lessonId ? "check" : "drill",
        position: served.length * 10 + qi,
        answer: payload.answer,
        seconds: payload.seconds,
        passageSeconds: qi === 0 ? passageSeconds : null,
        confidence: payload.confidence,
        prediction: qi === 0 ? prediction : null,
        changedFrom: payload.changedFrom,
      }),
    });
    const data = (await res.json()) as SubmitResponse;
    setResult(data);
    setPassageResults((r) => [...r, { id: q.id, type: q.type, correct: data.correct, seconds: payload.seconds }]);
  }

  async function onNext() {
    setResult(null);
    if (qi + 1 < qs.length) {
      setQi(qi + 1);
      qStart.current = Date.now();
      return;
    }
    // passage done
    const correct = passageResults.filter((r) => r.correct).length;
    const questionSeconds = passageResults.reduce((a, r) => a + r.seconds, 0);
    const summary = { passageId: passage!.id, title: passage!.title, correct, total: qs.length, passageSeconds, questionSeconds };
    setAllResults((a) => [...a, summary]);
    setPhase("passage_summary");
  }

  async function nextPassage() {
    const nextServed = [...served, passage!.id];
    setServed(nextServed);
    if (settings.passages && nextServed.length >= settings.passages) return finish();
    await loadPassage(nextServed);
  }

  async function finish() {
    if (sessionId) await fetch("/api/drill/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
    // A passage ended early still counts: roll its answered questions into the session totals.
    let results = allResults;
    if (passage && (phase === "question" || phase === "reading") && passageResults.length && !allResults.some((r) => r.passageId === passage.id)) {
      const correct = passageResults.filter((r) => r.correct).length;
      const questionSeconds = passageResults.reduce((a, r) => a + r.seconds, 0);
      results = [...allResults, { passageId: passage.id, title: `${passage.title} (partial)`, correct, total: passageResults.length, passageSeconds, questionSeconds }];
      setAllResults(results);
    }
    if (lessonId) {
      const score = results.reduce((a, r) => a + r.correct, 0);
      const total = results.reduce((a, r) => a + r.total, 0);
      await fetch("/api/lessons/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, score, total, threshold: 0.8 }) });
    }
    setPhase("done");
    router.refresh();
  }

  const cur = qs[qi];
  const last = allResults[allResults.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={lessonId ? `/learn/${lessonId}` : "/drill"} className="text-sm text-ink-3 hover:text-ink">
            ← {lessonId ? "Lesson" : "Drill setup"}
          </Link>
          <Badge tone="accent">RC</Badge>
          {settings.predictionMode && <Badge tone="info">Prediction mode</Badge>}
          {settings.passages > 0 && (
            <span className="text-xs text-ink-3">
              passage {Math.min(served.length + 1, settings.passages)} / {settings.passages}
            </span>
          )}
        </div>
        {(phase === "question" || phase === "reading") && (
          <Button variant="ghost" size="sm" onClick={finish}>
            End session
          </Button>
        )}
      </div>

      {phase === "loading" && <p className="text-ink-2">Picking a passage…</p>}
      {phase === "empty" && (
        <Card>
          <CardTitle>No passages available</CardTitle>
          <p className="mt-2 text-sm text-ink-2">Nothing matches these filters, or the RC bank hasn&apos;t been loaded yet.</p>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/drill">Back</Link>
          </Button>
        </Card>
      )}

      {(phase === "reading" || phase === "question") && passage && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
            <PassagePanel passage={passage} predictionMode={settings.predictionMode} onReady={onReady} />
          </div>
          <div>
            {phase === "reading" ? (
              <Card className="opacity-70">
                <p className="text-sm text-ink-2">{qs.length} questions follow. They unlock when you&apos;ve read the passage.</p>
                <ol className="mt-3 space-y-1 text-xs text-ink-3">
                  {qs.map((q, i) => (
                    <li key={q.id}>
                      {i + 1}. {typeLabel(q.type)} · L{q.difficulty}
                    </li>
                  ))}
                </ol>
              </Card>
            ) : (
              cur && (
                <QuestionCard
                  key={cur.id}
                  question={cur}
                  index={qi}
                  total={qs.length}
                  predictionMode={false}
                  onSubmit={onSubmit}
                  result={result}
                  onNext={onNext}
                  onToggleGuess={async (flag) => {
                    if (!result) return;
                    await fetch("/api/attempts/guess", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId: result.attemptId, flag }) });
                    setResult({ ...result, guessFlag: flag });
                  }}
                />
              )
            )}
          </div>
        </div>
      )}

      {phase === "passage_summary" && last && (
        <Card>
          <CardTitle>
            {last.title} — {last.correct}/{last.total}
          </CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <Stat label="Passage time" value={`${Math.round(last.passageSeconds)}s`} sub={last.passageSeconds / (last.passageSeconds + last.questionSeconds) >= 0.4 ? "≥ 40% on the passage ✓" : "under 40% on the passage — read more, answer faster"} />
            <Stat label="Questions time" value={`${Math.round(last.questionSeconds)}s`} sub={`${Math.round(last.questionSeconds / last.total)}s per question`} />
            <Stat label="Total" value={`${Math.round((last.passageSeconds + last.questionSeconds) / 60)}:${String(Math.round(last.passageSeconds + last.questionSeconds) % 60).padStart(2, "0")}`} sub="target ≈ 8:30 per passage set" />
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {passageResults.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between py-1.5">
                <span>
                  {i + 1}. {typeLabel(r.type)}
                </span>
                <span className={r.correct ? "text-ok" : "text-bad"}>
                  {r.correct ? "✓" : "✗"} · {Math.round(r.seconds)}s
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button onClick={nextPassage}>{settings.passages && served.length + 1 >= settings.passages ? "Finish" : "Next passage"}</Button>
            <Button variant="outline" onClick={finish}>
              End session
            </Button>
          </div>
        </Card>
      )}

      {phase === "done" && (
        <Card>
          <CardTitle>Session complete</CardTitle>
          <ul className="mt-3 divide-y divide-line text-sm">
            {allResults.map((r) => (
              <li key={r.passageId} className="flex items-center justify-between py-1.5">
                <span>{r.title}</span>
                <span>
                  {r.correct}/{r.total} · {Math.round((r.passageSeconds + r.questionSeconds) / 60)} min
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button asChild>
              <Link href={lessonId ? `/learn/${lessonId}` : "/drill"}>{lessonId ? "Back to lesson" : "Drill again"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/review">Review Inbox</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-line p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-ink-3">{sub}</p>
    </div>
  );
}
