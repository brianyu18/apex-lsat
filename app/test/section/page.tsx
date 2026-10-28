import { SectionRunner } from "@/components/test/section-runner";
import { bankStats } from "@/lib/data/drill";
import { rcBankStats } from "@/lib/data/rc";

export const metadata = { title: "Timed section" };
export const dynamic = "force-dynamic";

export default async function SectionPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const k = kind === "RC" ? "RC" : "LR";
  if (k === "RC") {
    const rc = await rcBankStats();
    return <SectionRunner bankCount={rc.passages} kind="RC" />;
  }
  const stats = await bankStats("LR");
  return <SectionRunner bankCount={stats.reduce((a, b) => a + b.n, 0)} kind="LR" />;
}
