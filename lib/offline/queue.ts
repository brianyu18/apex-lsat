"use client";

/**
 * Offline drill store (IndexedDB): a pack of questions fetched while online,
 * and a queue of attempts made while offline. The drill session falls back to
 * these when the network is gone and syncs the queue when it returns.
 */
const DB = "apex-offline";
const VER = 1;

export interface PackQuestion {
  id: string;
  section: "LR" | "RC";
  type: string;
  logicTags: string[] | null;
  difficulty: number;
  stimulus: string | null;
  stem: string | null;
  choices: Record<string, string> | null;
  answer: string | null;
  explanations: Record<string, string> | null;
  keyTakeaway: string | null;
  trapPatterns: Record<string, string> | null;
}
export interface QueuedAttempt {
  clientId: string;
  questionId: string;
  answer: string | null;
  seconds: number;
  confidence: "sure" | "leaning" | "guess" | null;
  changedFrom: string | null;
  at: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("pack")) d.createObjectStore("pack", { keyPath: "id" });
      if (!d.objectStoreNames.contains("queue")) d.createObjectStore("queue", { keyPath: "clientId" });
      if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "key" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve((req as IDBRequest<T> | undefined)?.result as T);
        t.onerror = () => reject(t.error);
      }),
  );
}

export const offline = {
  available: () => typeof indexedDB !== "undefined",
  async savePack(questions: PackQuestion[]) {
    await tx("pack", "readwrite", (s) => {
      s.clear();
      for (const q of questions) s.put(q);
    });
    await tx("meta", "readwrite", (s) => s.put({ key: "pack", builtAt: new Date().toISOString(), n: questions.length }));
  },
  packInfo: () => tx<{ key: string; builtAt: string; n: number } | undefined>("meta", "readonly", (s) => s.get("pack")),
  allPack: () => tx<PackQuestion[]>("pack", "readonly", (s) => s.getAll()),
  async nextFromPack(exclude: string[]): Promise<PackQuestion | null> {
    const all = await this.allPack();
    const used = new Set([...exclude, ...(await this.queued()).map((q) => q.questionId)]);
    const pool = all.filter((q) => !used.has(q.id));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  },
  enqueue: (a: QueuedAttempt) => tx("queue", "readwrite", (s) => s.put(a)),
  queued: () => tx<QueuedAttempt[]>("queue", "readonly", (s) => s.getAll()),
  async removeQueued(ids: string[]) {
    await tx("queue", "readwrite", (s) => {
      for (const id of ids) s.delete(id);
    });
  },
  /** Push queued attempts to the server; returns how many synced. */
  async sync(): Promise<number> {
    const q = await this.queued();
    if (!q.length) return 0;
    const res = await fetch("/api/offline/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attempts: q }) });
    if (!res.ok) return 0;
    const { synced } = (await res.json()) as { synced: string[] };
    await this.removeQueued(synced);
    return synced.length;
  },
  /** Refresh the pack from the server (call while online, cheaply, e.g. on drill page load). */
  async refreshPack(n = 100) {
    const res = await fetch(`/api/offline/pack?n=${n}`);
    if (!res.ok) return 0;
    const { questions } = (await res.json()) as { questions: PackQuestion[] };
    await this.savePack(questions);
    return questions.length;
  },
};
