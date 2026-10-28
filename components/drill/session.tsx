"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardTitle, Progress } from "@/components/ui/primitives";
import { DEFAULT_DRILL_SETTINGS } from "@/lib/data/drill-defaults";
import { QuestionCard } from "./question-card";
import { typeLabel } from "@/lib/content/labels";
import type { Confidence, DrillSettings, SafeQuestion, SessionRow, SubmitResponse } from "./types";
import { offline, type PackQuestion } from "@/lib/offline/queue";

type Phase = "loading" | "question" | "empty" | "summary" | "error";

export function DrillSession() {
  const params = useSearchParams();
  const router = useRouter();
  const settings = useMemo<DrillSettings>(() => {
    try {
      return { ...DEFAULT_DRILL_SETTINGS, ...JSON.parse(params.get("s") ?? "{}") };
    } catch {
      return DEFAULT_DRILL_SETTINGS;
    }
  }, [params]);

  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<SafeQuestion | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [served, setServed] = useState<string[]>([]);
  const [summary, setSummary] = useState<SessionRow[] | null>(null);
  const lessonId = params.get("lesson");
  const [lessonResult, setLessonResult] = useState<{ complete: boolean; score: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const offlinePack = useRef<Map<string, PackQuestion>>(new Map());
  const offlineRows = useRef<SessionRow[]>([]);
  const booted = useRef(false);

  /** Offline fallback: serve from the IndexedDB pack. Returns false if nothing is available. */
  const nextOffline = useCallback(async (exclude: string[]) => {
    if (!offline.available()) return false;
    const q = await offline.nextFromPack(exclude).catch(() => null);
    if (!q) return false;
    offlinePack.current.set(q.id, q);
    setOfflineMode(true);
    setQuestion({ id: q.id, section: q.section, type: q.type, logicTags: q.logicTags ?? [], difficulty: q.difficulty, stimulus: q.stimulus, stem: q.stem, choices: q.choices as SafeQuestion["choices"], predictionHint: null, passageId: null });
    setPhase("question");
    return true;
  }, []);

  const fetchNext = useCallback(
    async (exclude: string[], lt: string | null) => {
      setPhase("loading");
      setResult(null);
      let res: Response;
      try {
        res = await fetch("/api/drill/next", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ settings, excludeIds: exclude, lastType: lt }),
        });
      } catch {
        if (await nextOffline(exclude)) return;
        setErrorMsg("You're offline and no drill pack is cached. Open the Drill page once while online to cache 100 questions.");
        setPhase("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg(`Could not load a question (${res.status}).`);
        setPhase("error");
        return;
      }
      const data = (await res.json()) as { question: SafeQuestion | null };
      if (!data.question) {
        setPhase("empty");
        return;
      }
      setQuestion(data.question);
      setPhase("question");
    },
    [settings, nextOffline],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        const res = await fetch("/api/drill/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ settings, kind: lessonId ? "check" : "drill" }),
        });
        const { sessionId } = (await res.json()) as { sessionId: string };
        setSessionId(sessionId);
        await fetchNext([], null);
      } catch {
        if (!(await nextOffline([]))) {
          setErrorMsg("You're offline and no drill pack is cached. Open the Drill page once while online to cache 100 questions.");
          setPhase("error");
        }
      }
    })();
  }, [fetchNext, settings, lessonId, nextOffline]);

  async function onSubmit(payload: { answer: string; confidence: Confidence; seconds: number; prediction: string | null; changedFrom: string | null }) {
    if (!question) return;
    if (offlineMode) {
      // Grade locally from the pack and queue the attempt for sync.
      const q = offlinePack.current.get(question.id);
      if (!q) return;
      const correct = q.answer != null ? payload.answer === q.answer : null;
      const clientId = `off_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      await offline.enqueue({ clientId, questionId: q.id, answer: payload.answer, seconds: payload.seconds, confidence: payload.confidence, changedFrom: payload.changedFrom, at: new Date().toISOString() }).catch(() => {});
      offlineRows.current.push({ id: clientId, questionId: q.id, answer: payload.answer, correct, seconds: payload.seconds, confidence: payload.confidence, guessFlag: payload.seconds < 10, position: offlineRows.current.length, type: q.type, difficulty: q.difficulty, key: q.answer });
      setResult({ attemptId: clientId, correct, guessFlag: payload.seconds < 10, answer: q.answer, explanations: q.explanations, keyTakeaway: q.keyTakeaway, trapPatterns: q.trapPatterns } as SubmitResponse);
      return;
    }
    const res = await fetch("/api/drill/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: question.id,
        mode: lessonId ? "check" : "drill",
        position: index,
        answer: payload.answer,
        seconds: payload.seconds,
        confidence: payload.confidence,
        prediction: payload.prediction,
        changedFrom: payload.changedFrom,
      }),
    });
    const data = (await res.json()) as SubmitResponse;
    setResult(data);
  }

  async function finish() {
    if (offlineMode) {
      setSummary(offlineRows.current);
      setPhase("summary");
      return;
    }
    if (!sessionId) return;
    const res = await fetch("/api/drill/session", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
    const data = (await res.json()) as { summary: SessionRow[] };
    setSummary(data.summary);
    if (lessonId) {
      const score = data.summary.filter((r) => r.correct).length;
      const total = data.summary.length;
      const pr = await fetch("/api/lessons/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, score, total }) });
      const pj = (await pr.json()) as { complete: boolean };
      setLessonResult({ complete: pj.complete, score, total });
    }
    setPhase("summary");
    router.refresh();
  }

  async function onNext() {
    if (!question) return;
    const nextServed = [...served, question.id];
    const nextIndex = index + 1;
    setServed(nextServed);
    setIndex(nextIndex);
    if (settings.count && nextIndex >= settings.count) return finish();
    await fetchNext(nextServed, question.type);
  }

  async function onToggleGuess(flag: boolean) {
    if (!result) return;
    await fetch("/api/attempts/guess", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId: result.attemptId, flag }) });
    setResult({ ...result, guessFlag: flag });
  }

  const total = settings.count || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={lessonId ? `/learn/${lessonId}` : "/drill"} className="text-sm text-ink-3 hover:text-ink">
            ← {lessonId ? "Lesson" : "Drill setup"}
          </Link>
          {lessonId && <Badge tone="info">Lesson check</Badge>}
          {offlineMode && <Badge tone="warn" data-testid="offline-badge">Offline · will sync</Badge>}
          <Badge tone="accent">{settings.section}</Badge>
          {settings.pair && <Badge>{settings.pair.replace(/_/g, " ")}</Badge>}
          {settings.types?.[0] && <Badge>{typeLabel(settings.types[0])}</Badge>}
          {settings.predictionMode && <Badge tone="info">Prediction mode</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && phase !== "summary" && (
            <div className="w-40">
              <Progress value={(index / total) * 100} />
            </div>
          )}
          {phase === "question" && (
            <Button variant="ghost" size="sm" onClick={finish}>
              End session
            </Button>
          )}
        </div>
      </div>

      {phase === "loading" && <p className="text-ink-2">Picking the next question…</p>}
      {phase === "error" && (
        <Card>
          <p className="text-bad">{errorMsg}</p>
        </Card>
      )}
      {phase === "empty" && (
        <Card>
          <CardTitle>Nothing left to serve</CardTitle>
          <p className="mt-2 text-sm text-ink-2">No questions match these settings right now. Widen the scope, allow repeats, or add questions to the bank.</p>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline">
              <Link href="/drill">Change settings</Link>
            </Button>
            {served.length > 0 && <Button onClick={finish}>See summary</Button>}
          </div>
        </Card>
      )}
      {phase === "question" && question && (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          total={total}
          predictionMode={settings.predictionMode}
          onSubmit={onSubmit}
          result={result}
          onNext={onNext}
          onToggleGuess={onToggleGuess}
          showTimer={false}
        />
      )}
      {phase === "summary" && summary && (
        <>
          {lessonId && lessonResult && (
            <Card className={lessonResult.complete ? "border-ok" : "border-warn"}>
              <CardTitle>{lessonResult.complete ? "Lesson complete" : "Not yet"}</CardTitle>
              <p className="mt-1 text-sm text-ink-2">
                {lessonResult.score}/{lessonResult.total} on the check.{" "}
                {lessonResult.complete ? "Nice — move on, and the misses will come back through your inbox." : "You need 4 of 5. Reread the lesson, review the misses, and try the check again."}
              </p>
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/learn/${lessonId}`}>Back to lesson</Link>
                </Button>
                <Button asChild>
                  <Link href="/learn">Curriculum</Link>
                </Button>
              </div>
            </Card>
          )}
          <SessionSummary rows={summary} />
        </>
      )}
    </div>
  );
}

function SessionSummary({ rows }: { rows: SessionRow[] }) {
  const counted = rows.filter((r) => !r.guessFlag && r.correct != null);
  const correct = counted.filter((r) => r.correct).length;
  const acc = counted.length ? Math.round((correct / counted.length) * 100) : 0;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + (r.seconds ?? 0), 0) / rows.length) : 0;
  const missed = rows.filter((r) => r.correct === false);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${acc}%`} sub={`${correct}/${counted.length} counted`} />
        <Stat label="Questions" value={String(rows.length)} sub={`${rows.filter((r) => r.guessFlag).length} guessed`} />
        <Stat label="Avg time" value={`${avg}s`} sub="per question" />
        <Stat label="To review" value={String(missed.length + rows.filter((r) => r.correct && r.guessFlag).length)} sub="in your inbox" />
      </div>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-3">
            <tr className="border-b border-line">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Lvl</th>
              <th className="px-4 py-2 font-medium">You</th>
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2 tabular-nums text-ink-3">{i + 1}</td>
                <td className="px-4 py-2">{typeLabel(r.type)}</td>
                <td className="px-4 py-2">L{r.difficulty}</td>
                <td className="px-4 py-2">
                  <span className={r.correct ? "text-ok" : "text-bad"}>{r.answer ?? "—"}</span>
                  {r.guessFlag && <span className="ml-1 text-xs text-warn">(guess)</span>}
                </td>
                <td className="px-4 py-2">{r.key}</td>
                <td className="px-4 py-2 tabular-nums">{Math.round(r.seconds ?? 0)}s</td>
                <td className="px-4 py-2 capitalize text-ink-2">{r.confidence ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/drill">Drill again</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/review">Open Review Inbox</Link>
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
