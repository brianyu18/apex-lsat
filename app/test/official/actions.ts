"use server";
import { revalidatePath } from "next/cache";
import { setOfficialPts } from "@/lib/data/official";
import { parsePtList } from "@/lib/planner/official-track";

export async function savePtsAction(formData: FormData) {
  await setOfficialPts(parsePtList(String(formData.get("pts") ?? "")));
  revalidatePath("/test/official");
  revalidatePath("/plan");
}
