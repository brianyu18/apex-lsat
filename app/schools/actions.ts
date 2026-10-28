"use server";
import { revalidatePath } from "next/cache";
import { setGpa, toggleTarget } from "@/lib/data/schools";

export async function saveGpaAction(formData: FormData) {
  const raw = String(formData.get("gpa") ?? "").trim();
  const gpa = raw ? Math.max(0, Math.min(4.33, Number(raw))) : null;
  await setGpa(Number.isFinite(gpa as number) ? gpa : null);
  revalidatePath("/schools");
  revalidatePath("/plan");
}

export async function toggleTargetAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await toggleTarget(id);
  revalidatePath("/schools");
  revalidatePath("/plan");
}
