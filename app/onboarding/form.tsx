"use client";

import { useActionState, useMemo, useState } from "react";
import { saveOnboarding, type OnboardingState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, Input, Label, Select, Slider, Switch, Badge } from "@/components/ui/primitives";
import { rawToScaled, percentile } from "@/lib/scoring/tables";

import { format, parseISO } from "date-fns";
import { upcomingAdministrations } from "@/lib/planner/lsat-dates";

const TODAY = new Date().toISOString().slice(0, 10);
const UPCOMING_TESTS = upcomingAdministrations(TODAY)
  .filter((a) => a.registrable)
  .map((a) => ({ date: a.firstDay, label: `${a.label} (${format(parseISO(a.firstDay), "MMM d")}–${format(parseISO(a.lastDay), "d")})`, deadline: format(parseISO(a.registrationDeadline), "MMM d, yyyy") }));

type Defaults = {
  testDate: string | null;
  goalScore: number;
  hoursPerWeek: number;
  daysPerWeek: number;
  diagnostic: { pt?: number; lr1?: number; lr2?: number; rc?: number; scaled?: number } | null;
  onboarded: boolean;
};

export function OnboardingForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveOnboarding, undefined);
  const [undecided, setUndecided] = useState(defaults.onboarded && defaults.testDate == null);
  const DEFAULT_DATE = (UPCOMING_TESTS.find((t) => (new Date(t.date).getTime() - Date.now()) / 86400000 >= 140) ?? UPCOMING_TESTS[UPCOMING_TESTS.length - 1])?.date ?? "";
  const [testDate, setTestDate] = useState(defaults.testDate ?? DEFAULT_DATE);
  const [custom, setCustom] = useState(Boolean(defaults.testDate && !UPCOMING_TESTS.some((t) => t.date === defaults.testDate)));
  const [hours, setHours] = useState(defaults.hoursPerWeek);
  const [days, setDays] = useState(defaults.daysPerWeek);
  const [goal, setGoal] = useState(defaults.goalScore);
  const [skip, setSkip] = useState(defaults.diagnostic == null);
  const [lr1, setLr1] = useState<string>(defaults.diagnostic?.lr1?.toString() ?? "");
  const [lr2, setLr2] = useState<string>(defaults.diagnostic?.lr2?.toString() ?? "");
  const [rc, setRc] = useState<string>(defaults.diagnostic?.rc?.toString() ?? "");

  const estimate = useMemo(() => {
    const a = Number(lr1), b = Number(lr2), c = Number(rc);
    if (!lr1 || !lr2 || !rc || [a, b, c].some((n) => Number.isNaN(n))) return null;
    const raw = a + b + c;
    return rawToScaled(raw, 77);
  }, [lr1, lr2, rc]);

  const weeks = useMemo(() => {
    if (undecided) return 24;
    const ms = new Date(testDate).getTime() - Date.now();
    return Math.max(0, Math.round((ms / (7 * 86400000)) * 10) / 10);
  }, [undecided, testDate]);

  return (
    <form action={action} className="space-y-6">
      {/* Target */}
      <Card>
        <CardTitle>1. Target</CardTitle>
        <CardDescription>Pick a test date, or leave it open and get a provisional 24-week plan.</CardDescription>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="testDate">Test date</Label>
            {custom ? (
              <Input id="testDate" name="testDate" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} disabled={undecided} />
            ) : (
              <Select id="testDate" name="testDate" value={testDate} onChange={(e) => setTestDate(e.target.value)} disabled={undecided}>
                {UPCOMING_TESTS.map((t) => (
                  <option key={t.date} value={t.date}>
                    {t.label} · register by {t.deadline}
                  </option>
                ))}
              </Select>
            )}
            <button type="button" className="mt-1 text-xs text-accent hover:underline" onClick={() => setCustom((c) => !c)}>
              {custom ? "Choose an official administration" : "Enter a custom date"}
            </button>
            <div className="mt-2 flex items-center gap-2">
              <Switch id="undecided" name="undecided" checked={undecided} onCheckedChange={setUndecided} />
              <Label htmlFor="undecided" className="mb-0">
                Not sure yet
              </Label>
            </div>
          </div>
          <div>
            <Label htmlFor="goalScore">Goal score</Label>
            <Input
              id="goalScore"
              name="goalScore"
              type="number"
              min={150}
              max={180}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            />
            <p className="mt-1.5 text-xs text-ink-3">
              {goal} ≈ top {Math.max(0.1, Math.round((100 - percentile(goal)) * 10) / 10)}% of test takers
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <Badge tone={weeks < 12 ? "warn" : "ok"}>{weeks} weeks</Badge>
          <span>
            {weeks < 12
              ? "Tight. Fine if you're already in the mid-160s; otherwise consider the next date."
              : weeks < 20
                ? "Workable fast track for a 170+ from most starting points."
                : "Room to reach the 175+ band with consistent weeks."}
          </span>
        </div>
      </Card>

      {/* Time */}
      <Card>
        <CardTitle>2. Time</CardTitle>
        <CardDescription>Be honest — the plan sizes every day from this.</CardDescription>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <Label className="mb-0">Hours per week</Label>
              <span className="text-sm font-medium tabular-nums">{hours} h</span>
            </div>
            <Slider min={2} max={40} step={1} value={[hours]} onValueChange={([v]) => setHours(v)} />
            <input type="hidden" name="hoursPerWeek" value={hours} />
            <p className="mt-2 text-xs text-ink-3">≈ {Math.round(hours * weeks)} hours total before the test</p>
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <Label className="mb-0">Study days per week</Label>
              <span className="text-sm font-medium tabular-nums">{days}</span>
            </div>
            <Slider min={1} max={7} step={1} value={[days]} onValueChange={([v]) => setDays(v)} />
            <input type="hidden" name="daysPerWeek" value={days} />
            <p className="mt-2 text-xs text-ink-3">6 is recommended; consistency beats volume.</p>
          </div>
        </div>
      </Card>

      {/* Diagnostic */}
      <Card>
        <CardTitle>3. Where you&apos;re starting</CardTitle>
        <CardDescription>
          Take LawHub&apos;s free PrepTest 158 timed (2 LR + 1 RC, 35 min each), then enter how many you got right in
          each section.
        </CardDescription>
        <div className="mt-4 flex items-center gap-2">
          <Switch id="skipDiagnostic" name="skipDiagnostic" checked={skip} onCheckedChange={setSkip} />
          <Label htmlFor="skipDiagnostic" className="mb-0">
            I haven&apos;t taken a diagnostic yet — start the plan with one
          </Label>
        </div>
        {!skip && (
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="diagnosticPt">PrepTest #</Label>
              <Input id="diagnosticPt" name="diagnosticPt" type="number" placeholder="158" defaultValue={defaults.diagnostic?.pt ?? 158} />
            </div>
            <div>
              <Label htmlFor="lr1">LR 1 correct</Label>
              <Input id="lr1" name="lr1" type="number" min={0} max={27} value={lr1} onChange={(e) => setLr1(e.target.value)} placeholder="/ 25" />
            </div>
            <div>
              <Label htmlFor="lr2">LR 2 correct</Label>
              <Input id="lr2" name="lr2" type="number" min={0} max={27} value={lr2} onChange={(e) => setLr2(e.target.value)} placeholder="/ 25" />
            </div>
            <div>
              <Label htmlFor="rc">RC correct</Label>
              <Input id="rc" name="rc" type="number" min={0} max={28} value={rc} onChange={(e) => setRc(e.target.value)} placeholder="/ 27" />
            </div>
            <input type="hidden" name="lrTotalQuestions" value={50} />
            <input type="hidden" name="rcTotalQuestions" value={27} />
            <div className="sm:col-span-4 flex flex-wrap items-center gap-3 text-sm">
              {estimate != null ? (
                <>
                  <Badge tone="info">Estimated {estimate}</Badge>
                  <span className="text-ink-2">
                    {percentile(estimate)}th percentile · {goal - estimate > 0 ? `${goal - estimate} points to your goal` : "already at goal — aim higher"}
                  </span>
                </>
              ) : (
                <span className="text-ink-3">Or enter the scaled score LawHub reported:</span>
              )}
              <Input name="diagnosticScaledOverride" type="number" min={120} max={180} placeholder="e.g. 158" className="w-28" />
            </div>
          </div>
        )}
      </Card>

      {state?.error && (
        <p role="alert" className="rounded-[var(--radius)] border border-bad bg-bad-soft px-3 py-2 text-sm text-bad">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Building your plan…" : "Build my plan"}
        </Button>
      </div>
    </form>
  );
}
