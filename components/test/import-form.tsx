"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { commitImport, previewImport, type ImportState } from "@/app/test/import/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardTitle, Input, Label } from "@/components/ui/primitives";

const EXAMPLE = `PT 158
S1 LR: 1 A A, 2 C B, 3 D D, 4 B B, 5 E E, 6 A C, 7 D D, 8 B B, 9 C C, 10 E E, 11 A A, 12 B D, 13 C C, 14 D D, 15 E E, 16 A A, 17 B B, 18 C C, 19 E D, 20 A A, 21 B B, 22 C C, 23 D D, 24 E E, 25 A A
S2 RC: 1 B B, 2 C C, 3 A D, 4 E E, 5 D D, 6 A A, 7 C C, 8 B B, 9 E E, 10 D D, 11 C A, 12 B B, 13 A A, 14 E E, 15 D D, 16 C C, 17 B B, 18 A A, 19 E E, 20 D B, 21 C C, 22 B B, 23 A A, 24 E E, 25 D D, 26 C C, 27 B B
S3 LR (experimental): 1 A A, 2 B B
S4 LR: 1 A A, 2 B B, 3 C C, 4 D D, 5 E E, 6 A A, 7 B C, 8 C C, 9 D D, 10 E E, 11 A A, 12 B B, 13 C C, 14 D D, 15 E A, 16 A A, 17 B B, 18 C C, 19 D D, 20 E E, 21 A A, 22 B B, 23 C C, 24 D D, 25 E E`;

export function ImportForm() {
  const [text, setText] = useState("");
  const [pt, setPt] = useState("");
  const [scaled, setScaled] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [preview, previewAction, previewing] = useActionState<ImportState, FormData>(previewImport, undefined);
  const [saved, commitAction, saving] = useActionState<ImportState, FormData>(commitImport, undefined);

  if (saved?.saved) {
    return (
      <Card className="border-ok">
        <CardTitle>Imported</CardTitle>
        <p className="mt-1 text-sm text-ink-2">
          {saved.saved.correct}/{saved.saved.total} scored · ≈ {saved.saved.scaled}. It now counts toward your score range; misses are in your Review Inbox tagged by PT/section/question so you can review them in LawHub.
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <Link href="/analytics">See your range</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/test/import">Import another</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Paste your results</CardTitle>
        <CardDescription>
          Format: a <code>PT</code> line, then one line per section — <code>S1 LR:</code> followed by <code>question your-answer key</code> triples separated by commas. Mark the unscored section <code>(experimental)</code>. A LawHub score-report CSV also works.
        </CardDescription>
        <form className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="pt">PrepTest #</Label>
              <Input id="pt" name="pt" type="number" value={pt} onChange={(e) => setPt(e.target.value)} placeholder="158" />
            </div>
            <div>
              <Label htmlFor="scaled">Scaled score (from LawHub)</Label>
              <Input id="scaled" name="scaled" type="number" min={120} max={180} value={scaled} onChange={(e) => setScaled(e.target.value)} placeholder="optional" />
            </div>
            <div>
              <Label htmlFor="takenOn">Date taken</Label>
              <Input id="takenOn" name="takenOn" type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="text" className="mb-0">
                Results
              </Label>
              <button type="button" className="text-xs text-accent hover:underline" onClick={() => setText(EXAMPLE)}>
                Paste an example
              </button>
            </div>
            <textarea id="text" name="text" value={text} onChange={(e) => setText(e.target.value)} rows={10} className="focus-ring w-full rounded-[var(--radius)] border border-line bg-bg-elev p-3 font-mono text-xs" placeholder={"PT 158\nS1 LR: 1 A A, 2 C B, …"} />
          </div>
          {(preview?.error || saved?.error) && (
            <p role="alert" className="text-sm text-bad">
              {preview?.error ?? saved?.error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" formAction={previewAction} variant="outline" disabled={previewing}>
              {previewing ? "Parsing…" : "Preview"}
            </Button>
            <Button type="submit" formAction={commitAction} disabled={saving || !preview?.preview}>
              {saving ? "Saving…" : "Import"}
            </Button>
          </div>
        </form>
      </Card>

      {preview?.preview && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>PT {preview.preview.pt}</CardTitle>
            <div className="flex gap-2">
              <Badge tone="accent">
                {preview.preview.correct}/{preview.preview.total} scored
              </Badge>
              {preview.preview.scaled && <Badge tone="info">{preview.preview.scaled} reported</Badge>}
            </div>
          </div>
          <ul className="mt-3 divide-y divide-line text-sm">
            {preview.preview.sections.map((s) => (
              <li key={s.n} className="flex items-center justify-between py-1.5">
                <span>
                  Section {s.n} · {s.kind} {s.scored ? "" : <Badge tone="neutral">experimental</Badge>}
                </span>
                <span className="tabular-nums">
                  {s.correct}/{s.total}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Looks right? Click Import. Questions are stored by reference (PT · section · number) only.</p>
        </Card>
      )}
    </div>
  );
}
