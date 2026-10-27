import { Suspense } from "react";
import { DrillSession } from "@/components/drill/session";

export const metadata = { title: "Drill session" };

export default function DrillSessionPage() {
  return (
    <Suspense fallback={<p className="text-ink-2">Loading…</p>}>
      <DrillSession />
    </Suspense>
  );
}
