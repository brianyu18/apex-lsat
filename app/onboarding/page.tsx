import { OnboardingForm } from "./form";
import { getSettings } from "@/lib/data/settings";

export const metadata = { title: "Get started" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Set up</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your plan starts here</h1>
        <p className="mt-2 text-ink-2">
          Tell Apex your target date and weekly time, and where you&apos;re starting from. The plan flexes to any
          test date — change it later without losing progress.
        </p>
      </header>
      <OnboardingForm
        defaults={{
          testDate: s.testDate,
          goalScore: s.goalScore,
          hoursPerWeek: s.hoursPerWeek,
          daysPerWeek: s.daysPerWeek,
          diagnostic: s.diagnostic ?? null,
          onboarded: s.onboarded,
        }}
      />
    </div>
  );
}
