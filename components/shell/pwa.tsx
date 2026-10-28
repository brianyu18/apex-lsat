"use client";

/** Registers the service worker, keeps the offline drill pack fresh, and syncs queued attempts when the network returns. */
import { useEffect, useState } from "react";
import { offline } from "@/lib/offline/queue";

export function Pwa() {
  const [synced, setSynced] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!offline.available()) return;
    const run = async () => {
      if (!navigator.onLine) return;
      try {
        const n = await offline.sync();
        if (n) setSynced(n);
        const info = await offline.packInfo();
        if (!info || Date.now() - new Date(info.builtAt).getTime() > 24 * 3600_000) await offline.refreshPack(100);
      } catch {
        /* best effort */
      }
    };
    void run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, []);
  if (!synced) return null;
  return (
    <div role="status" className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg shadow md:bottom-6">
      Synced {synced} offline attempt{synced > 1 ? "s" : ""}.
    </div>
  );
}
