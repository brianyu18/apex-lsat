"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/primitives";

/** How far into a deck this browser has got. Kept in local storage, per device. */
export function DeckProgress({ id }: { id: string }) {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem("deck:seen") ?? "{}") as Record<string, number>;
      if (seen[id]) setPct(seen[id]);
    } catch {}
  }, [id]);
  if (pct == null) return null;
  return <Badge tone={pct >= 100 ? "ok" : "neutral"}>{pct >= 100 ? "Done" : `${pct}%`}</Badge>;
}
