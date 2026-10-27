import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { getSettings } from "@/lib/data/settings";
import { getActivePlan, getPlanDays } from "@/lib/data/plan";
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
  const days = await getPlanDays(plan.id);
  const today = format(new Date(), "yyyy-MM-dd");
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
                <span>{b.label}</span>
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
