"use client";

/**
 * Timed Argumentative Writing practice: 15-minute prewrite (OutlineBuilder,
 * no essay box yet) → 35-minute essay (outline pinned beside the editor) →
 * save. Mirrors the real test's two clocks; the prewrite clock can be ended
 * early, the essay clock auto-submits.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { EMPTY_OUTLINE, OutlineBuilder, outlineScore, type Outline, type WritingPrompt } from "@/components/writing/outline-builder";
import { PREWRITE_SEC, WRITE_SEC } from "@/lib/writing/prompts";
import { cn } from "@/lib/ui/cn";

type Phase = "setup" | "prewrite" | "write" | "saving" | "done";

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function WritingRunner({ prompt, lessonId }: { prompt: WritingPrompt & { id: string }; lessonId?: string | null }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [outline, setOutline] = useState<Outline>(EMPTY_OUTLINE);
  const [essay, setEssay] = useState("");
  const [left, setLeft] = useState(PREWRITE_SEC);
  const [saved, setSaved] = useState<{ id: string; words: number } | null>(null);
  const phaseStart = useRef(Date.now());
  const prewriteSec = useRef(0);
  const submitted = useRef(false);

  useEffect(() => {
    if (phase !== "prewrite" && phase !== "write") return;
    const total = phase === "prewrite" ? PREWRITE_SEC : WRITE_SEC;
    const t = setInterval(() => {
      const l = total - Math.floor((Date.now() - phaseStart.current) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) {
        if (phase === "prewrite") startWriting();
        else void save();
      }
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startPrewrite() {
    phaseStart.current = Date.now();
    setLeft(PREWRITE_SEC);
    setPhase("prewrite");
  }
  function startWriting() {
    prewriteSec.current = Math.min(PREWRITE_SEC, Math.floor((Date.now() - phaseStart.current) / 1000));
    phaseStart.current = Date.now();
    setLeft(WRITE_SEC);
    setPhase("write");
  }
  async function save() {
    if (submitted.current) return;
    submitted.current = true;
    const writeSec = Math.min(WRITE_SEC, Math.floor((Date.now() - phaseStart.current) / 1000));
    setPhase("saving");
    const res = await fetch("/api/writing/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ promptId: prompt.id, outline, essay, prewriteSec: prewriteSec.current, writeSec, lessonId: lessonId ?? null }) });
    setSaved((await res.json()) as { id: string; words: number });
    setPhase("done");
    router.refresh();
  }

  const words = essay.trim().split(/\s+/).filter(Boolean).length;
  const score = outlineScore(outline);

  if (phase === "setup") {
    return (
      <Card>
        <CardTitle>Argumentative Writing · {prompt.title}</CardTitle>
        <CardDescription>
          Two clocks, like the real thing: <strong>15 minutes</strong> to analyze the prompt and plan (you can end early), then <strong>35 minutes</strong> to write (auto-submits at zero). The essay is unscored on the LSAT but sent to every school you apply to — a clear, committed, well-organized argument is the goal.
        </CardDescription>
        <p className="mt-3 text-xs text-ink-3">You will see the issue and perspectives when the first clock starts. No notes in advance.</p>
        <div className="mt-5 flex justify-end">
          <Button size="lg" onClick={startPrewrite}>
            Start prewriting
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "prewrite") {
    return (
      <div className="space-y-3" data-testid="writing-prewrite">
        <div className="flex items-center justify-between rounded-md border border-line bg-bg-sunken px-4 py-2 text-sm">
          <span className="font-semibold">Prewriting</span>
          <span className={cn("font-mono tabular-nums", left <= 120 && "font-semibold text-bad")} data-testid="writing-timer">
            {fmt(left)}
          </span>
        </div>
        <OutlineBuilder prompt={prompt} value={outline} onChange={setOutline} />
        <div className="flex justify-end">
          <Button onClick={startWriting}>Start writing{score.done < score.total ? ` (${score.done}/${score.total} planned)` : ""}</Button>
        </div>
      </div>
    );
  }

  if (phase === "write") {
    return (
      <div className="space-y-3" data-testid="writing-essay">
        <div className="flex items-center justify-between rounded-md border border-line bg-bg-sunken px-4 py-2 text-sm">
          <span className="font-semibold">Essay</span>
          <span className="text-ink-3">{words} words</span>
          <span className={cn("font-mono tabular-nums", left <= 300 && "font-semibold text-bad")} data-testid="writing-timer">
            {fmt(left)}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <aside className="space-y-3 text-sm lg:sticky lg:top-4 lg:self-start">
            <Card className="p-4">
              <p className="lsat-text font-medium">{prompt.issue}</p>
              <ol className="mt-2 space-y-1 text-xs text-ink-2">
                {prompt.perspectives.map((p) => (
                  <li key={p.label}>
                    <span className="font-semibold">{p.label}.</span> {p.text}
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Your plan</p>
              <p className="mt-1 font-medium">{outline.thesis || <span className="text-ink-3">No thesis written.</span>}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
                {outline.reasons.filter((r) => r.claim).map((r, i) => (
                  <li key={i}>
                    {r.claim}
                    {r.support && <span className="text-ink-3"> — {r.support}</span>}
                  </li>
                ))}
                {outline.counter.perspective && (
                  <li>
                    Objection ({outline.counter.perspective}): {outline.counter.concession} <span className="text-ink-3">→ {outline.counter.rebuttal}</span>
                  </li>
                )}
              </ol>
            </Card>
          </aside>
          <div>
            <textarea aria-label="Essay" value={essay} onChange={(e) => setEssay(e.target.value)} spellCheck={false} placeholder="Write the essay here. Thesis in the first paragraph; one reason per paragraph; address the objection; close in one sentence." className="focus-ring min-h-[60dvh] w-full rounded-md border border-line bg-bg-elev p-4 font-serif text-[16px] leading-7" />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-ink-3">Target 400–600 words. No spell-check on test day either.</p>
              <Button onClick={() => void save()} disabled={words < 50}>
                Submit essay
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "saving") return <p className="text-ink-2">Saving…</p>;

  return (
    <Card data-testid="writing-done">
      <CardTitle>Essay saved</CardTitle>
      <CardDescription>
        {saved?.words ?? words} words · prewrite {fmt(prewriteSec.current)} · {lessonId ? "Lesson marked complete." : "Find it under Recent essays to reread tomorrow with fresh eyes."}
      </CardDescription>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-4 text-sm">
          <p className="font-semibold">Self-review checklist</p>
          <ul className="mt-2 space-y-1 text-ink-2">
            <li>□ Thesis is a claim, stated in paragraph 1, not hedged.</li>
            <li>□ Each body paragraph has one reason and concrete support.</li>
            <li>□ The strongest opposing perspective is named, conceded, and answered.</li>
            <li>□ No paragraph merely summarizes the prompt.</li>
            <li>□ Sentences are plain; no filler openers (&quot;In today&apos;s society…&quot;).</li>
          </ul>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-semibold">Outline check at submission</p>
          <p className="mt-1 text-ink-2">
            {score.done}/{score.total} planning items complete. {score.done < 5 ? "A thin plan usually shows up as a drifting middle paragraph — prewrite harder next time." : "Good plan; the essay should read as five intentional paragraphs."}
          </p>
        </Card>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild>
          <Link href={lessonId ? `/learn/${lessonId}` : "/test/writing"}>{lessonId ? "Back to lesson" : "Another prompt"}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/test">Test hub</Link>
        </Button>
      </div>
    </Card>
  );
}
