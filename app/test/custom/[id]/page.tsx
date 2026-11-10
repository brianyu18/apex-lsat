import { notFound } from "next/navigation";
import { PtRunner } from "@/components/test/pt-runner";
import { getCustomTest } from "@/lib/data/custom";

export const dynamic = "force-dynamic";

export default async function TakeCustomTest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getCustomTest(id);
  if (!t) notFound();
  const summary = `${t.sections.length} section${t.sections.length > 1 ? "s" : ""} (${t.sections.map((s) => `${s.kind} ${s.minutes} min`).join(", ")}), ${t.nQuestions} scored questions.`;
  return <PtRunner customTestId={t.id} customTitle={t.title} customSummary={summary} />;
}
