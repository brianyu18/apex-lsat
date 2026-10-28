import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { getSettings } from "@/lib/data/settings";
import { getActivePlan, getPlanDays, phaseSignals, registrationStatus } from "@/lib/data/plan";
import { officialForDay } from "@/lib/data/official";
import { dateOptions } from "@/lib/data/plan";
import { INTENSITY_COPY } from "@/lib/planner/intensity";
import { applyHoursAction, switchTestDateAction } from "./actions";
import { PHASE_LABELS, type Phase } from "@/lib/planner/generate";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PlanCalendar } from "@/components/plan/calendar";
import { ChangePlanForm } from "@/components/plan/change-form";

export const metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

const PHASE_SHORT: Record<Phase, string> = { foundations: "Foundations", lr: "LR", rc: "RC", mixed: "Mixed timed", protect: "Protect" };

const PHASE_TONE: Record<Phase, "neutral" | "accent" | "ok" | "warn" | "bad" | "info"> = {
  foundations: "info",
  lr: "accent",
  rc: "ok",
  mixed: "warn",
  protect: "neutral",
};

export default async function PlanPage() {
  const s = await getSettings();
  if (!s.onboarded) redirect("/onboarding");
  const plan = await getActivePlan();
  if (!plan) redirect("/onboarding");
  const today = format(new Date(), "yyyy-MM-dd");
  const [days, signals, reg, todaysOfficial, dates] = await Promise.all([getPlanDays(plan.id), phaseSignals(), registrationStatus(), officialForDay(today), dateOptions(today)]);
  const INT_TONE = { relaxed: "ok", standard: "accent", aggressive: "warn", unrealistic: "bad" } as const;
  const extra = (plan.extraDays ?? {}) as Record<string, number>;
  const regTone = reg.advice.verdict === "register" ? "ok" : reg.advice.verdict === "postpone" ? "bad" : reg.advice.verdict === "keep" ? "warn" : "neutral";
  const todayRow = days.find((d) => d.day === today);
  const currentPhase = todayRow?.phase ?? plan.phases[0]?.phase;
  const daysLeft = plan.testDate ? differenceInCalendarDays(parseISO(plan.testDate), parseISO(today)) : null;
  const totalHours = Math.round(days.reduce((a, d) => a + d.minutes, 0) / 60);
  const doneHours = Math.round(days.reduce((a, d) => a + (d.completed ? d.minutes : d.completedMinutes), 0) / 60);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Plan</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {plan.provisional ? "Provisional 24-week plan" : `Test day ${format(parseISO(plan.testDate!), "MMM d, yyyy")}`}
          </h1>
          <p className="mt-1 text-ink-2">
            {daysLeft != null && !plan.provisional ? `${daysLeft} days to go · ` : ""}
            {plan.hoursPerWeek} h/week on {plan.daysPerWeek} days · {doneHours}/{totalHours} h logged
          </p>
        </div>
        <ChangePlanForm testDate={plan.testDate} provisional={plan.provisional} hoursPerWeek={plan.hoursPerWeek} daysPerWeek={plan.daysPerWeek} />
      </header>

      {/* Phase strip */}
      <Card className="p-4">
        <div className="flex w-full overflow-hidden rounded-md">
          {plan.phases.map((p) => {
            const share = Math.max(9, (p.weeks / plan.phases.reduce((a, x) => a + x.weeks, 0)) * 100);
            const active = p.phase === currentPhase;
            return (
              <div
                key={p.phase}
                style={{ width: `${share}%` }}
                aria-label={`${PHASE_LABELS[p.phase as Phase]}, ${p.weeks} weeks`}
                className={`relative h-6 border-r sm:h-10 border-bg-elev last:border-r-0 ${
                  active ? "bg-accent" : "bg-bg-sunken"
                }`}
                title={`${PHASE_LABELS[p.phase as Phase]} · ${p.start} → ${p.end}`}
              >
                <span className={`absolute inset-0 hidden items-center justify-center truncate px-2 text-xs font-medium sm:flex ${active ? "text-accent-ink" : "text-ink-2"}`}>
                  {PHASE_SHORT[p.phase as Phase]} · {p.weeks}w
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.phases.map((p) => (
            <Badge key={p.phase} tone={PHASE_TONE[p.phase as Phase]}>
              {PHASE_LABELS[p.phase as Phase]}: {format(parseISO(p.start), "MMM d")} – {format(parseISO(p.end), "MMM d")}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Intensity + test-date what-if */}
      <Card data-testid="intensity-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Pace for {dates.current?.admin?.label ?? (plan.provisional ? "a provisional date" : "your date")}</CardTitle>
            <CardDescription>
              {dates.estimate.score != null ? `From ${dates.estimate.score} (${dates.estimate.source === "range" ? "your score range" : "your diagnostic"}) to ${dates.goal}` : `No diagnostic yet — modeled from a cold start to ${dates.goal}`}
              {dates.current ? `: about ${dates.current.pace.hoursNeeded} hours of work over ${dates.current.pace.weeks} weeks.` : "."}
            </CardDescription>
          </div>
          {dates.current && (
            <Badge tone={INT_TONE[dates.current.pace.label]}>
              {dates.current.pace.label} · {dates.current.pace.hoursPerWeek} h/week needed
            </Badge>
          )}
        </div>
        {dates.current && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <p className="text-ink-2">{INTENSITY_COPY[dates.current.pace.label]}</p>
            {Math.abs(dates.current.pace.hoursPerWeek - dates.hoursPerWeek) >= 1 && (
              <form action={applyHoursAction}>
                <input type="hidden" name="hoursPerWeek" value={dates.current.pace.hoursPerWeek} />
                <Button type="submit" size="sm" variant="outline">
                  Set {dates.current.pace.hoursPerWeek} h/week (now {dates.hoursPerWeek})
                </Button>
              </form>
            )}
            {dates.current.pace.expectedGainAtCurrentHours != null && dates.estimate.score != null && (
              <span className="text-xs text-ink-3">
                At your current {dates.hoursPerWeek} h/week the model expects ≈ {Math.min(180, dates.estimate.score + dates.current.pace.expectedGainAtCurrentHours)} by test day.
              </span>
            )}
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" data-testid="date-options">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">
                <th className="py-1.5 font-medium">Administration</th>
                <th className="py-1.5 font-medium">Register by</th>
                <th className="py-1.5 font-medium">Scores out</th>
                <th className="py-1.5 font-medium">Weeks</th>
                <th className="py-1.5 font-medium">Pace</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {dates.options.map((o) => (
                <tr key={o.id} className={`border-b border-line last:border-b-0 ${o.selected ? "bg-accent-soft/30" : ""}`}>
                  <td className="py-1.5 font-medium">
                    {o.label} <span className="text-xs text-ink-3">{format(parseISO(o.firstDay), "MMM d")}–{format(parseISO(o.lastDay), "d")}</span>
                  </td>
                  <td className={`py-1.5 ${o.registrable ? "" : "text-bad"}`}>{format(parseISO(o.registrationDeadline), "MMM d")}{o.registrable ? "" : " · passed"}</td>
                  <td className="py-1.5 text-ink-2">{format(parseISO(o.scoreRelease), "MMM d")}</td>
                  <td className="py-1.5 tabular-nums">{o.pace.weeks}</td>
                  <td className="py-1.5">
                    <Badge tone={INT_TONE[o.pace.label]}>
                      {o.pace.label} · {o.pace.hoursPerWeek} h/wk
                    </Badge>
                  </td>
                  <td className="py-1.5 text-right">
                    {o.selected ? (
                      <span className="text-xs text-ink-3">current</span>
                    ) : o.registrable ? (
                      <form action={switchTestDateAction}>
                        <input type="hidden" name="testDate" value={o.firstDay} />
                        <input type="hidden" name="hoursPerWeek" value={o.pace.feasible ? o.pace.hoursPerWeek : ""} />
                        <button type="submit" className="focus-ring rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-line-strong">
                          Switch{o.pace.feasible ? ` · ${o.pace.hoursPerWeek} h/wk` : ""}
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">Official dates from LSAC (subject to change; confirm on lsac.org). Pace model: ~10 h per point below 160, 14 in the 160s, 20 at 170+, plus 40 h of foundations from a cold start; the final week is protected, not counted. Switching dates re-plans from today and keeps completed days.</p>
      </Card>

      {/* Readiness: exit criteria + registration */}
      <div className="grid gap-4 lg:grid-cols-2" data-testid="readiness">
        <Card>
          <CardTitle>Phase exit criteria</CardTitle>
          <CardDescription>Each phase has a bar to clear. If the data says it isn&apos;t cleared in the phase&apos;s final week, re-planning extends that phase by a week and the later phases absorb it.</CardDescription>
          <ul className="mt-3 space-y-2 text-sm">
            <Criterion label="Foundations" met={signals.foundationsPassed} text="≥ 80% of Unit 1 lesson checks passed" extra={extra.foundations} />
            <Criterion label="Logical Reasoning" met={signals.lrReady} text="≥ 75% of LR types (≥ 10 attempts each) rated at level 3+" extra={extra.lr} />
            <Criterion label="Reading Comprehension" met={signals.rcReady} text="RC rating at level 3+ over ≥ 30 attempts" extra={extra.rc} />
          </ul>
        </Card>
        <Card className={reg.advice.verdict === "register" ? "border-ok" : reg.advice.verdict === "postpone" ? "border-bad" : ""}>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Registration</CardTitle>
            <Badge tone={regTone}>{reg.advice.verdict}</Badge>
          </div>
          <p className="mt-2 text-sm text-ink-2">{reg.advice.reason}</p>
          {reg.range.n > 0 && (
            <p className="mt-2 text-xs text-ink-3">
              Range {reg.range.low}–{reg.range.high} over {reg.range.n} full-length test{reg.range.n > 1 ? "s" : ""} · goal {reg.goal}{reg.goalSource === "targets" ? " (from your target schools)" : ""}. Rule: register when the floor is within 2 of the goal.
            </p>
          )}
        </Card>
      </div>

      {/* Today */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Today · {format(parseISO(today), "EEEE, MMM d")}</CardTitle>
            <CardDescription>{todayRow ? PHASE_LABELS[todayRow.phase as Phase] : "Not on the plan"}</CardDescription>
          </div>
          {todayRow && todayRow.minutes > 0 && <Badge tone="accent">{todayRow.minutes} min</Badge>}
        </div>
        {todayRow && (
          <ul className="mt-4 divide-y divide-line">
            {todayRow.blocks.map((b, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span>
                  {b.label}
                  {b.kind === "pt" && todaysOfficial != null && (
                    <>
                      {" "}
                      — <span className="font-medium text-accent">Official PrepTest {todaysOfficial} in LawHub</span>{" "}
                      <Link href={`/test/import?pt=${todaysOfficial}`} className="text-xs underline">
                        import
                      </Link>
                    </>
                  )}
                </span>
                <span className="tabular-nums text-ink-3">{b.minutes ? `${b.minutes} min` : ""}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <Link href="/drill">Start drilling</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/learn">Open lessons</Link>
          </Button>
        </div>
      </Card>

      <PlanCalendar days={days.map((d) => ({ day: d.day, phase: d.phase, minutes: d.minutes, completed: d.completed, blocks: d.blocks }))} today={today} testDate={plan.testDate} />
    </div>
  );
}

function Criterion({ label, met, text, extra }: { label: string; met: boolean | null | undefined; text: string; extra?: number }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className={met ? "text-ok" : met === false ? "text-bad" : "text-ink-3"}>
        {met ? "✓" : met === false ? "✗" : "○"}
      </span>
      <span>
        <span className="font-medium">{label}</span> <span className="text-ink-2">— {text}</span>
        {met == null && <span className="ml-1 text-xs text-ink-3">(not enough data yet)</span>}
        {extra ? <span className="ml-1 text-xs text-warn">extended +{extra} days</span> : null}
      </span>
    </li>
  );
}
