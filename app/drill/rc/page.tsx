import { Suspense } from "react";
import { RcDrillSession } from "@/components/drill/rc-session";

export const metadata = { title: "RC drill" };

export default function RcDrillPage() {
  return (
    <Suspense fallback={<p className="text-ink-2">Loading…</p>}>
      <RcDrillSession />
    </Suspense>
  );
}
