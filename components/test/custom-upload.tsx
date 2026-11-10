"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { previewCustomTest, uploadCustomTest } from "@/app/test/custom/actions";

type Summary = { title: string; sections: { kind: string; scored: boolean; minutes: number; questions: number; passages?: number }[]; questions: number };

export function CustomUpload() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setText(await f.text());
    setSummary(null);
    setErrors([]);
  }
  async function check() {
    setBusy(true);
    const r = await previewCustomTest(text);
    setBusy(false);
    if (r.ok) {
      setSummary(r.summary);
      setErrors([]);
    } else {
      setSummary(null);
      setErrors(r.errors);
    }
  }
  async function save() {
    setBusy(true);
    const r = await uploadCustomTest(text);
    setBusy(false);
    if (!r.ok) return setErrors(r.errors);
    setText("");
    setSummary(null);
    setConfirmed(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept="application/json,.json" aria-label="Test file" onChange={(e) => void onFile(e.target.files?.[0])} className="text-sm" />
        <a href="/api/custom/template" className="text-sm text-accent underline">
          Download the template
        </a>
      </div>
      <textarea aria-label="Test JSON" value={text} onChange={(e) => { setText(e.target.value); setSummary(null); }} rows={8} spellCheck={false} placeholder='{ "format": "apex-test/1", "title": "…", "sections": [ … ] }' className="focus-ring w-full rounded-md border border-line bg-bg-elev p-3 font-mono text-xs" />
      {errors.length > 0 && (
        <ul role="alert" className="rounded-md bg-bad-soft p-3 text-sm text-bad">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {summary && (
        <div className="rounded-md border border-line p-3 text-sm" data-testid="custom-preview">
          <p className="font-semibold">{summary.title}</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {summary.sections.map((s, i) => (
              <li key={i}>
                <Badge tone={s.scored ? "accent" : "neutral"}>
                  S{i + 1} {s.kind} · {s.questions} Q{s.passages ? ` · ${s.passages} passages` : ""} · {s.minutes} min{s.scored ? "" : " · unscored"}
                </Badge>
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-start gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>This is my own material or material I have the right to use this way. It will be stored only in my private database.</span>
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={check} disabled={busy || !text.trim()}>
          Check file
        </Button>
        <Button onClick={save} disabled={busy || !summary || !confirmed}>
          Add test
        </Button>
      </div>
    </div>
  );
}
