"use client";

/**
 * TutorPanel — a small Socratic chat anchored to one question. Streams the
 * reply from /api/tutor. Collapsed by default so it never gets in the way of
 * the student's own review first.
 */
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS: Record<string, string[]> = {
  missed: ["I got this wrong — walk me to it without telling me the answer.", "Why is my answer tempting, and what kills it?", "What should I have noticed in the first 30 seconds?"],
  correct: ["I got it right but wasn't sure. Check my reasoning?", "What's the fastest way to see this one?", "What would the hard version of this question look like?"],
  official: ["Here's the gist of the question (I'll paste it): …", "I keep missing this type on real tests. Where do I start?"],
};

export function TutorPanel({ questionId, attemptId, outcome = "missed", official = false, defaultOpen = false }: { questionId: string; attemptId?: string | null; outcome?: "missed" | "correct"; official?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setError(null);
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, attemptId: attemptId ?? null, messages: next }), signal: abort.current.signal });
      if (!res.ok || !res.body) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) throw new Error("Empty reply from the tutor.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message.includes("claude CLI") ? "The tutor runs through the local `claude` CLI. Make sure it's installed and logged in on this machine (or set ANTHROPIC_API_KEY)." : (e as Error).message);
        setMsgs(next);
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  const starters = official ? STARTERS.official : STARTERS[outcome];

  return (
    <section aria-label="Tutor" className="card p-0" data-testid="tutor-panel">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="focus-ring flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircleQuestion className="h-4 w-4 text-accent" /> Ask the tutor
        </span>
        <span className="text-xs text-ink-3">{open ? "Hide" : "Socratic — it won't give you the answer unless you ask"}</span>
      </button>
      {open && (
        <div className="border-t border-line p-4">
          {msgs.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <button key={s} type="button" onClick={() => (s.endsWith("…") ? setInput(s.replace("…", "")) : send(s))} className="focus-ring rounded-md border border-line px-2.5 py-1.5 text-left text-xs text-ink-2 hover:border-line-strong">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 max-h-[50dvh] space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={cn("rounded-md px-3 py-2 text-sm leading-6", m.role === "user" ? "ml-6 bg-accent-soft text-ink" : "mr-6 bg-bg-sunken text-ink")}>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">{m.role === "user" ? "You" : "Tutor"}</p>
                <p className="whitespace-pre-wrap">{m.content || (busy ? "…" : "")}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-bad">
              {error}
            </p>
          )}
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea aria-label="Message the tutor" value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder={official ? "Paste the stimulus, stem and choices, then your question…" : "Your reasoning, or a question…"} className="focus-ring min-h-[44px] flex-1 rounded-md border border-line bg-bg-elev p-2.5 text-sm" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} />
            {busy ? (
              <Button type="button" variant="outline" size="icon" onClick={() => abort.current?.abort()} aria-label="Stop">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      )}
    </section>
  );
}
