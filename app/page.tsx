import { redirect } from "next/navigation";
import { getSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSettings();
  if (!s.onboarded) redirect("/onboarding");
  redirect("/plan");
}
