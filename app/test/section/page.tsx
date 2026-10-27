import { SectionRunner } from "@/components/test/section-runner";
import { bankStats } from "@/lib/data/drill";

export const metadata = { title: "Timed section" };
export const dynamic = "force-dynamic";

export default async function SectionPage() {
  const stats = await bankStats("LR");
  const count = stats.reduce((a, b) => a + b.n, 0);
  return <SectionRunner bankCount={count} />;
}
