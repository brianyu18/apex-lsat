import { DrillSettingsForm } from "@/components/drill/settings-form";
import { DEFAULT_DRILL_SETTINGS, bankStats } from "@/lib/data/drill";
import { getSkill } from "@/lib/data/skills";
import { skillLevel } from "@/lib/engine/rating";
import { reviewCounts } from "@/lib/data/review";

export const metadata = { title: "Drill" };
export const dynamic = "force-dynamic";

export default async function DrillPage() {
  const [stats, skill, counts] = await Promise.all([bankStats("LR"), getSkill("section", "LR"), reviewCounts()]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Drill</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">One question at a time</h1>
        <p className="mt-1 text-ink-2">Untimed, accuracy first. Every answer carries a confidence tag so the engine can tell knowledge from luck.</p>
      </header>
      <DrillSettingsForm defaults={DEFAULT_DRILL_SETTINGS} skillLevel={skillLevel(skill.rating)} available={stats} inboxCount={counts.inbox} dueCount={counts.due} />
    </div>
  );
}
