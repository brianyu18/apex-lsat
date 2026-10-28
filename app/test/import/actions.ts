"use server";

import { revalidatePath } from "next/cache";
import { parseLawHub, summarize } from "@/lib/import/lawhub";
import { saveImportedTest } from "@/lib/data/import";

export type ImportState = { error?: string; preview?: ReturnType<typeof summarize> & { pt: number; scaled: number | null }; saved?: { sessionId: string; scaled: number; correct: number; total: number } } | undefined;

export async function previewImport(_prev: ImportState, fd: FormData): Promise<ImportState> {
  try {
    const text = String(fd.get("text") ?? "");
    const pt = Number(fd.get("pt")) || undefined;
    const scaledRaw = String(fd.get("scaled") ?? "").trim();
    const scaled = scaledRaw ? Number(scaledRaw) : null;
    const parsed = parseLawHub(text, { pt, scaled });
    return { preview: { ...summarize(parsed), pt: parsed.pt, scaled: parsed.scaled ?? null } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function commitImport(_prev: ImportState, fd: FormData): Promise<ImportState> {
  try {
    const text = String(fd.get("text") ?? "");
    const pt = Number(fd.get("pt")) || undefined;
    const scaledRaw = String(fd.get("scaled") ?? "").trim();
    const scaled = scaledRaw ? Number(scaledRaw) : null;
    const takenOn = String(fd.get("takenOn") ?? "").trim() || null;
    const parsed = parseLawHub(text, { pt, scaled });
    const saved = await saveImportedTest(parsed, { takenOn });
    revalidatePath("/test");
    revalidatePath("/");
    revalidatePath("/analytics");
    return { saved };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
