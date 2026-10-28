import { SkipTrainer } from "@/components/test/skip-trainer";
import { bankStats } from "@/lib/data/drill";
import { getSettings } from "@/lib/data/settings";

export const metadata = { title: "Skip trainer" };
export const dynamic = "force-dynamic";

export default async function SkipTrainerPage() {
  const [stats, settings] = await Promise.all([bankStats("LR"), getSettings()]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Test</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Skip trainer</h1>
        <p className="mt-1 text-ink-2">The 170+ skill nobody drills: deciding in ten seconds whether a question is worth your next ninety.</p>
      </header>
      <SkipTrainer goal={settings.goalScore} bankCount={stats.reduce((a, b) => a + b.n, 0)} />
    </div>
  );
}
