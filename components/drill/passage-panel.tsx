"use client";

/**
 * PassagePanel — the RC passage with paragraph numbers, optional comparative
 * A/B, a reading timer that stops at "I've read it", and (in prediction mode)
 * a main-point prompt before questions unlock.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { RC_STYLE_LABELS, type RCStyle } from "@/lib/content/taxonomy";

export interface PassageView {
  id: string;
  title: string;
  style: string | null;
  topic: string | null;
  comparative: boolean;
  paragraphs: string[];
  paragraphsB: string[] | null;
  wordCount?: number | null;
}

export function PassagePanel({
  passage,
  predictionMode,
  onReady,
  compact = false,
}: {
  passage: PassageView;
  predictionMode: boolean;
  onReady: (passageSeconds: number, prediction: string | null) => void;
  compact?: boolean;
}) {
  const start = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [showB, setShowB] = useState<"A" | "B" | "both">("both");

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [done]);

  function ready() {
    const secs = (Date.now() - start.current) / 1000;
    setDone(true);
    onReady(secs, predictionMode ? prediction : null);
  }

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");
  const target = passage.comparative ? "3–4 min" : "3–4 min";

  return (
    <section aria-label="Passage" className={compact ? "" : "card p-5 sm:p-6"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
        <div className="flex flex-wrap items-center gap-2">
          {passage.style && <Badge>{RC_STYLE_LABELS[passage.style as RCStyle] ?? passage.style}</Badge>}
          {passage.topic && <Badge tone="neutral">{passage.topic.replace("_", " ")}</Badge>}
          {passage.comparative && <Badge tone="info">Comparative</Badge>}
          {passage.wordCount ? <span>{passage.wordCount} words</span> : null}
        </div>
        {!done && (
          <span className="tabular-nums" title={`Target ${target} reading`}>
            reading {mm}:{ss}
          </span>
        )}
      </div>

      {passage.comparative && passage.paragraphsB && (
        <div className="mb-3 flex gap-1 text-xs">
          {(["A", "B", "both"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setShowB(v)} className={`focus-ring rounded-full border px-2.5 py-1 ${showB === v ? "border-ink bg-ink text-bg" : "border-line text-ink-2"}`}>
              {v === "both" ? "Both" : `Passage ${v}`}
            </button>
          ))}
        </div>
      )}

      <div className={passage.comparative && showB === "both" ? "grid gap-5 lg:grid-cols-2" : ""}>
        {(showB !== "B" || !passage.comparative) && (
          <div>
            {passage.comparative && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Passage A</p>}
            {passage.paragraphs.map((p, i) => (
              <p key={i} className="lsat-text mb-3 flex gap-3">
                <span className="mt-1 select-none text-[10px] text-ink-3" aria-hidden>
                  {i + 1}
                </span>
                <span>{p}</span>
              </p>
            ))}
          </div>
        )}
        {passage.comparative && passage.paragraphsB && showB !== "A" && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Passage B</p>
            {passage.paragraphsB.map((p, i) => (
              <p key={i} className="lsat-text mb-3 flex gap-3">
                <span className="mt-1 select-none text-[10px] text-ink-3" aria-hidden>
                  {i + 1}
                </span>
                <span>{p}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {!done && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {predictionMode && (
            <div>
              <label htmlFor="pp-main" className="mb-1 block text-sm font-medium text-ink-2">
                Before the questions: the main point, in your own words
              </label>
              <textarea id="pp-main" value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={2} className="focus-ring w-full rounded-[var(--radius)] border border-line bg-bg-elev p-2.5 text-sm" placeholder="One sentence…" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-3">Aim for {target} on the passage. Build the map; don&apos;t memorize details.</p>
            <Button onClick={ready} disabled={predictionMode && prediction.trim().length < 8}>
              I&apos;ve read it — show questions
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
