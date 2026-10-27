"use client";

/**
 * QuickClassify — the one-tap "why did I miss this?" row shown under the
 * explanation after a miss or a lucky guess in drill. Pre-suggests a cause from
 * timing/confidence/trap; saving writes the miss row immediately.
 */
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { classify, type ErrorType } from "@/lib/engine/classify";
import { cn } from "@/lib/ui/cn";

const OPTIONS: { id: ErrorType; label: string }[] = [
  { id: "misread", label: "Misread" },
  { id: "logic_gap", label: "Logic gap" },
  { id: "trap", label: "Fell for a trap" },
  { id: "time_pressure", label: "Rushed / guessed" },
  { id: "careless", label: "Careless" },
];

export function QuickClassify({
  attemptId,
  correct,
  guessFlag,
  seconds,
  confidence,
  changedFrom,
  changedFromWasCorrect,
  myTrap,
  difficulty,
}: {
  attemptId: string;
  correct: boolean | null;
  guessFlag: boolean;
  seconds: number;
  confidence: "sure" | "leaning" | "guess" | null;
  changedFrom: string | null;
  changedFromWasCorrect: boolean;
  myTrap: string | null;
  difficulty: number;
}) {
  const suggestion = useMemo(() => classify({ correct, guessFlag, seconds, confidence, changedFrom, changedFromWasCorrect, myTrap, difficulty }), [correct, guessFlag, seconds, confidence, changedFrom, changedFromWasCorrect, myTrap, difficulty]);
  const [picked, setPicked] = useState<ErrorType | null>(null);
  const [saved, setSaved] = useState<ErrorType | null>(null);
  const [takeaway, setTakeaway] = useState("");

  const isGuessRight = correct && guessFlag;

  async function save(t: ErrorType) {
    setPicked(t);
    await fetch("/api/review/classify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, errorType: t, trapSubtype: suggestion.trapSubtype, takeaway: takeaway || null }) });
    setSaved(t);
  }

  return (
    <div className="mt-4 rounded-md border border-line bg-bg-sunken/60 p-3" data-testid="quick-classify">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{isGuessRight ? "Lucky — what was missing?" : "Why did this happen?"}</p>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-ok">
            <Check className="h-3 w-3" /> saved
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-3">
        Suggested: <span className="font-medium text-ink-2">{OPTIONS.find((o) => o.id === suggestion.errorType)?.label ?? "Logic gap"}</span> — {suggestion.reason}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Error type">
        {OPTIONS.map((o) => {
          const active = (picked ?? (saved ? saved : null)) === o.id;
          const suggested = suggestion.errorType === o.id && !picked && !saved;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => save(o.id)}
              className={cn(
                "focus-ring rounded-full border px-2.5 py-1 text-xs font-medium",
                active ? "border-accent bg-accent text-accent-ink" : suggested ? "border-accent text-accent" : "border-line text-ink-2 hover:border-line-strong",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <input
        value={takeaway}
        onChange={(e) => setTakeaway(e.target.value)}
        onBlur={() => saved && save(saved)}
        placeholder="One-line takeaway (optional — you can write it in Review later)"
        aria-label="Takeaway"
        className="focus-ring mt-2 h-9 w-full rounded-md border border-line bg-bg-elev px-2 text-sm"
      />
    </div>
  );
}
