"use server";

import { revalidatePath } from "next/cache";
import { setReviewed } from "@/lib/data/review";

export async function markReviewed(attemptId: string, reviewed: boolean) {
  await setReviewed(attemptId, reviewed);
  revalidatePath("/review");
  revalidatePath("/");
}
