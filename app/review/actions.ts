"use server";

import { revalidatePath } from "next/cache";
import { setReviewed } from "@/lib/data/review";

export async function markReviewed(attemptId: string, reviewed: boolean) {
  await setReviewed(attemptId, reviewed);
  revalidatePath("/review");
  revalidatePath("/");
}

export async function saveGist(formData: FormData) {
  const { setGist } = await import("@/lib/data/official");
  const questionId = String(formData.get("questionId") ?? "");
  const attemptId = String(formData.get("attemptId") ?? "");
  if (questionId) await setGist(questionId, String(formData.get("gist") ?? ""));
  const { revalidatePath } = await import("next/cache");
  if (attemptId) revalidatePath(`/review/${attemptId}`);
}
