"use server";
import { revalidatePath } from "next/cache";
import { parseCustomTest } from "@/lib/custom/schema";
import { deleteCustomTest, saveCustomTest } from "@/lib/data/custom";

export async function previewCustomTest(text: string) {
  const r = parseCustomTest(text);
  return r.ok ? { ok: true as const, summary: r.summary } : { ok: false as const, errors: r.errors };
}

export async function uploadCustomTest(text: string) {
  const r = parseCustomTest(text);
  if (!r.ok) return { ok: false as const, errors: r.errors };
  const saved = await saveCustomTest(r.test);
  revalidatePath("/test/custom");
  return { ok: true as const, id: saved.id };
}

export async function deleteCustomTestAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteCustomTest(id);
  revalidatePath("/test/custom");
}
