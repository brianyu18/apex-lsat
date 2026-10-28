"use server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { updateSettings } from "@/lib/data/settings";
import { regeneratePlan } from "@/lib/data/plan";

export async function switchTestDateAction(formData: FormData) {
  const testDate = String(formData.get("testDate") ?? "");
  const hours = formData.get("hoursPerWeek");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(testDate) || testDate <= format(new Date(), "yyyy-MM-dd")) return;
  await updateSettings({ testDate, ...(hours ? { hoursPerWeek: Math.max(2, Math.min(60, Number(hours))) } : {}) });
  await regeneratePlan({ preserveCompleted: true });
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/test/official");
}

export async function applyHoursAction(formData: FormData) {
  const hours = Number(formData.get("hoursPerWeek"));
  if (!Number.isFinite(hours)) return;
  await updateSettings({ hoursPerWeek: Math.max(2, Math.min(60, hours)) });
  await regeneratePlan({ preserveCompleted: true });
  revalidatePath("/");
  revalidatePath("/plan");
}
