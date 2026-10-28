import { SectionRunner } from "@/components/test/section-runner";
import { bankStats } from "@/lib/data/drill";
import { rcBankStats } from "@/lib/data/rc";

export const metadata = { title: "Timed section" };
export const dynamic = "force-dynamic";

export default async function SectionPage({ searchParams }: { searchParams: Promise<{ kind?: string; lesson?: string; n?: string; min?: string }> }) {
  const { kind, lesson, n, min } = await searchParams;
  const k = kind === "RC" ? "RC" : "LR";
  if (k === "RC") {
    const rc = await rcBankStats();
    return <SectionRunner bankCount={rc.passages} kind="RC" />;
  }
  const stats = await bankStats("LR");
  const presetN = n ? Math.max(5, Math.min(26, Number(n) || 25)) : undefined;
  const presetMinutes = min ? Math.max(5, Math.min(53, Number(min) || 35)) : undefined;
  return <SectionRunner bankCount={stats.reduce((a, b) => a + b.n, 0)} kind="LR" lessonId={lesson ?? null} presetN={presetN} presetMinutes={presetMinutes} />;
}
