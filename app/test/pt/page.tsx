import { PtRunner } from "@/components/test/pt-runner";
import { getSettings } from "@/lib/data/settings";

export const metadata = { title: "Practice test" };
export const dynamic = "force-dynamic";

/** The three-section format starts with the August 2027 administration; a later target date defaults to it. */
export default async function PtPage() {
  const s = await getSettings();
  return <PtRunner defaultFormat={s.testDate && s.testDate >= "2027-08-01" ? "2027" : "current"} />;
}
