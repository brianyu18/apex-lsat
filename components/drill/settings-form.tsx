"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardDescription, CardTitle, Label, Slider, Switch } from "@/components/ui/primitives";
import { cn } from "@/lib/ui/cn";
import {
  LOGIC_TAGS,
  LOGIC_TAG_LABELS,
  LR_PAIRS,
  LR_PAIR_LABELS,
  LR_TYPE_INFO,
  lrTypesInPair,
  type Difficulty,
  type LRPair,
} from "@/lib/content/taxonomy";
import type { DrillSettings } from "@/lib/data/drill-defaults";

const STORAGE_KEY = "apex.drill.settings";

export function DrillSettingsForm({
  defaults,
  skillLevel,
  available,
  inboxCount,
  dueCount,
}: {
  defaults: DrillSettings;
  skillLevel: Difficulty;
  available: { type: string; difficulty: number; n: number }[];
  inboxCount: number;
  dueCount: number;
}) {
  const router = useRouter();
  const [s, setS] = useState<DrillSettings>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  });
  const [auto, setAuto] = useState(s.levels == null);
  const [scope, setScope] = useState<"all" | "pair" | "type" | "tag">(s.pair ? "pair" : s.types ? "type" : s.tags ? "tag" : "all");
  const [nudge, setNudge] = useState<string | null>(null);

  const countsByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of available) m[a.type] = (m[a.type] ?? 0) + a.n;
    return m;
  }, [available]);

  function update(patch: Partial<DrillSettings>) {
    setS((prev) => ({ ...prev, ...patch }));
  }

  function chooseType(t: string) {
    const pair = LR_TYPE_INFO[t as keyof typeof LR_TYPE_INFO]?.pair;
    const partners = pair ? lrTypesInPair(pair).filter((x) => x !== t) : [];
    if (partners.length) {
      setNudge(`Drilling ${LR_TYPE_INFO[t as keyof typeof LR_TYPE_INFO].label} alone works, but you'll improve faster drilling it with ${partners.map((p) => LR_TYPE_INFO[p].label).join(" and ")} — the skills overlap.`);
    }
    update({ types: [t], pair: null, tags: null });
  }

  function start() {
    const final: DrillSettings = { ...s, levels: auto ? null : s.levels };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    } catch {}
    router.push(`/drill/session?s=${encodeURIComponent(JSON.stringify(final))}`);
  }

  const levels = s.levels ?? [];
  const toggleLevel = (d: Difficulty) => update({ levels: levels.includes(d) ? levels.filter((x) => x !== d) : [...levels, d].sort() });

  return (
    <div className="space-y-5">
      {/* Quick starts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStart
          title="Smart drill"
          desc={`Auto difficulty around your level (L${skillLevel}), mixed types.`}
          onClick={() => {
            const final = { ...defaults, levels: null, pair: null, types: null, tags: null };
            router.push(`/drill/session?s=${encodeURIComponent(JSON.stringify(final))}`);
          }}
        />
        <QuickStart
          title={`Review due · ${dueCount}`}
          desc="Re-drill misses that are due today, paired with similar questions."
          disabled={dueCount === 0}
          onClick={() => router.push(`/drill/session?s=${encodeURIComponent(JSON.stringify({ ...defaults, sources: ["due"], count: 0 }))}`)}
        />
        <QuickStart
          title="Reading Comprehension"
          desc="One passage at a time: read, map, then the questions. Passage time tracked separately."
          onClick={() => router.push(`/drill/rc?s=${encodeURIComponent(JSON.stringify({ passages: 2, predictionMode: false }))}`)}
        />
        <QuickStart
          title="Warm-up"
          desc="Ten easy questions, accuracy only. Good before a timed section."
          onClick={() => router.push(`/drill/session?s=${encodeURIComponent(JSON.stringify({ ...defaults, levels: [1, 2], count: 10 }))}`)}
        />
      </div>

      <Card>
        <CardTitle>Custom drill</CardTitle>
        <CardDescription>Everything below is optional — the defaults are what the engine would choose.</CardDescription>

        {/* Scope */}
        <div className="mt-5">
          <Label>What to drill</Label>
          <div className="flex flex-wrap gap-2">
            {(["all", "pair", "type", "tag"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setScope(k);
                  if (k === "all") update({ pair: null, types: null, tags: null });
                  setNudge(null);
                }}
                className={cn("focus-ring rounded-full border px-3 py-1 text-sm capitalize", scope === k ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2")}
              >
                {k === "all" ? "Everything" : k === "pair" ? "A pair" : k === "type" ? "One type" : "A logic tag"}
              </button>
            ))}
          </div>
          {scope === "pair" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {LR_PAIRS.map((p) => (
                <ChoiceRow key={p} active={s.pair === p} onClick={() => update({ pair: p as LRPair, types: null, tags: null })} title={LR_PAIR_LABELS[p]} meta={`${lrTypesInPair(p).reduce((a, t) => a + (countsByType[t] ?? 0), 0)} questions`} />
              ))}
            </div>
          )}
          {scope === "type" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(LR_TYPE_INFO)
                .sort((a, b) => b.freq - a.freq)
                .map((t) => (
                  <ChoiceRow key={t.id} active={s.types?.[0] === t.id} onClick={() => chooseType(t.id)} title={t.label} meta={`${countsByType[t.id] ?? 0} · ~${t.freq.toFixed(1)}/section`} />
                ))}
            </div>
          )}
          {scope === "tag" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {LOGIC_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ tags: [t], pair: null, types: null })}
                  className={cn("focus-ring rounded-full border px-3 py-1 text-sm", s.tags?.[0] === t ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2")}
                >
                  {LOGIC_TAG_LABELS[t]}
                </button>
              ))}
            </div>
          )}
          {nudge && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
              <span>{nudge}</span>
              <Button size="sm" variant="outline" onClick={() => { const t = s.types![0] as keyof typeof LR_TYPE_INFO; update({ pair: LR_TYPE_INFO[t].pair, types: null }); setScope("pair"); setNudge(null); }}>
                Drill the pair
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNudge(null)}>
                Just this type
              </Button>
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Difficulty</Label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-2">Auto</span>
                <Switch checked={auto} onCheckedChange={setAuto} aria-label="Auto difficulty" />
              </div>
            </div>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={auto}
                  onClick={() => toggleLevel(d)}
                  className={cn(
                    "focus-ring h-10 flex-1 rounded-[var(--radius)] border text-sm font-medium",
                    auto ? "border-line text-ink-3" : levels.includes(d) ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-2",
                    auto && d <= skillLevel && "bg-bg-sunken text-ink-2",
                  )}
                >
                  L{d}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">
              {auto ? `Auto serves levels at or below your skill (L${skillLevel}) and stretches above it ${s.randomDifficultyPct}% of the time.` : "Manual levels override the engine. Changing this often slows progress."}
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <Label className="mb-0">Stretch above your level</Label>
              <span className="text-sm tabular-nums">{s.randomDifficultyPct}%</span>
            </div>
            <Slider min={0} max={50} step={5} value={[s.randomDifficultyPct]} onValueChange={([v]) => update({ randomDifficultyPct: v })} disabled={!auto} />
            <div className="mt-4 flex items-center justify-between">
              <Label className="mb-0">Questions this session</Label>
              <div className="flex gap-1">
                {[5, 10, 15, 25, 0].map((n) => (
                  <button key={n} type="button" onClick={() => update({ count: n })} className={cn("focus-ring rounded-md px-2.5 py-1 text-sm", s.count === n ? "bg-ink text-bg" : "bg-bg-sunken text-ink-2")}>
                    {n === 0 ? "∞" : n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Toggle label="Prediction mode" desc="Hide the question and answers until you've written what's wrong." checked={s.predictionMode} onChange={(v) => update({ predictionMode: v })} />
          <Toggle label="Allow repeats" desc="Re-serve questions you've seen in the last 30 days." checked={s.repeat} onChange={(v) => update({ repeat: v })} />
          <Toggle
            label={`Include inbox · ${inboxCount}`}
            desc="Mix in questions waiting in your Review Inbox."
            checked={s.sources.includes("inbox")}
            onChange={(v) => update({ sources: v ? Array.from(new Set([...s.sources, "inbox", "due"])) : s.sources.filter((x) => x !== "inbox") })}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Badge tone="neutral">{available.reduce((a, b) => a + b.n, 0)} questions in bank</Badge>
          <Button size="lg" onClick={start}>
            Start drill
          </Button>
        </div>
      </Card>
    </div>
  );
}

function QuickStart({ title, desc, onClick, disabled }: { title: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="card focus-ring p-4 text-left transition-colors hover:border-line-strong disabled:opacity-50">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-2">{desc}</p>
    </button>
  );
}

function ChoiceRow({ active, onClick, title, meta }: { active: boolean; onClick: () => void; title: string; meta: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("focus-ring flex items-center justify-between rounded-[var(--radius)] border px-3 py-2 text-left text-sm", active ? "border-accent bg-accent-soft text-accent" : "border-line")}>
      <span className="font-medium">{title}</span>
      <span className="text-xs text-ink-3">{meta}</span>
    </button>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-[var(--radius)] border border-line p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-3">{desc}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
