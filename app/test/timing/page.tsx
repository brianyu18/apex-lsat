import { TimingHeatmap } from "@/components/test/timing-heatmap";
import { timingGrid } from "@/lib/data/sections";

export const metadata = { title: "Timing heatmap" };
export const dynamic = "force-dynamic";

export default async function TimingPage() {
  const grid = await timingGrid(12);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-accent">Test</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Timing heatmap</h1>
        <p className="mt-1 text-ink-2">Every timed section, question by question. Colour is time against the pacing target; a red ring is a miss. Look for columns, not cells: a pattern by position is a pacing problem, a pattern by type is a skills problem.</p>
      </header>
      <TimingHeatmap grid={grid} />
    </div>
  );
}
