"use client";

import { useActionState, useState } from "react";
import { changePlanSettings, type OnboardingState } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, Input, Label, Select, Switch } from "@/components/ui/primitives";
import { format, parseISO } from "date-fns";
import { upcomingAdministrations } from "@/lib/planner/lsat-dates";

export function ChangePlanForm({
  testDate,
  provisional,
  hoursPerWeek,
  daysPerWeek,
}: {
  testDate: string | null;
  provisional: boolean;
  hoursPerWeek: number;
  daysPerWeek: number;
}) {
  const [open, setOpen] = useState(false);
  const [undecided, setUndecided] = useState(provisional);
  const admins = upcomingAdministrations(new Date().toISOString().slice(0, 10)).filter((a) => a.registrable);
  const [custom, setCustom] = useState(Boolean(testDate && !provisional && !admins.some((a) => a.firstDay === testDate)));
  const [date, setDate] = useState(provisional ? (admins[0]?.firstDay ?? "") : (testDate ?? ""));
  const [state, action, pending] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const r = await changePlanSettings(prev, fd);
    if (!r?.error) setOpen(false);
    return r;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Change date or hours</Button>
      </DialogTrigger>
      <DialogContent title="Re-plan">
        <form action={action} className="space-y-4">
          <p className="text-sm text-ink-2">Days you&apos;ve already completed stay as they are; everything from today is regenerated.</p>
          <div>
            <Label htmlFor="cp-date">Test date</Label>
            {custom ? (
              <Input id="cp-date" name="testDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={undecided} />
            ) : (
              <Select id="cp-date" name="testDate" value={date} onChange={(e) => setDate(e.target.value)} disabled={undecided}>
                {admins.map((a) => (
                  <option key={a.id} value={a.firstDay}>
                    {a.label} ({format(parseISO(a.firstDay), "MMM d")}–{format(parseISO(a.lastDay), "d")}) · register by {format(parseISO(a.registrationDeadline), "MMM d")}
                  </option>
                ))}
              </Select>
            )}
            <button type="button" className="mt-1 text-xs text-accent hover:underline" onClick={() => setCustom((c) => !c)}>
              {custom ? "Choose an official administration" : "Enter a custom date"}
            </button>
            <div className="mt-2 flex items-center gap-2">
              <Switch id="cp-undecided" name="undecided" checked={undecided} onCheckedChange={setUndecided} />
              <Label htmlFor="cp-undecided" className="mb-0">
                Not sure yet
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cp-hours">Hours / week</Label>
              <Input id="cp-hours" name="hoursPerWeek" type="number" min={2} max={60} step={0.5} defaultValue={hoursPerWeek} />
            </div>
            <div>
              <Label htmlFor="cp-days">Days / week</Label>
              <Input id="cp-days" name="daysPerWeek" type="number" min={1} max={7} defaultValue={daysPerWeek} />
            </div>
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-bad">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Re-planning…" : "Re-plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
