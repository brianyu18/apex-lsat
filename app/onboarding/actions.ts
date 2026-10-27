"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { format } from "date-fns";
import { updateSettings } from "@/lib/data/settings";
import { regeneratePlan } from "@/lib/data/plan";
import { rawToScaled } from "@/lib/scoring/tables";

const OnboardingSchema = z.object({
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  goalScore: z.coerce.number().int().min(150).max(180),
  hoursPerWeek: z.coerce.number().min(2).max(60),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  diagnosticPt: z.coerce.number().int().min(100).max(200).optional(),
  lr1: z.coerce.number().int().min(0).max(27).optional(),
  lr2: z.coerce.number().int().min(0).max(27).optional(),
  rc: z.coerce.number().int().min(0).max(28).optional(),
  lrTotalQuestions: z.coerce.number().int().min(44).max(54).default(50),
  rcTotalQuestions: z.coerce.number().int().min(24).max(28).default(27),
  diagnosticScaledOverride: z.coerce.number().int().min(120).max(180).optional(),
  skipDiagnostic: z.coerce.boolean().default(false),
});

export type OnboardingState = { error?: string } | undefined;

export async function saveOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = OnboardingSchema.safeParse({
    ...raw,
    testDate: raw.undecided === "on" || !raw.testDate ? null : raw.testDate,
    skipDiagnostic: raw.skipDiagnostic === "on",
    diagnosticPt: raw.diagnosticPt || undefined,
    lr1: raw.lr1 || undefined,
    lr2: raw.lr2 || undefined,
    rc: raw.rc || undefined,
    diagnosticScaledOverride: raw.diagnosticScaledOverride || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: `${first.path.join(".")}: ${first.message}` };
  }
  const d = parsed.data;
  if (d.testDate && d.testDate <= format(new Date(), "yyyy-MM-dd")) {
    return { error: "Test date must be in the future." };
  }

  let diagnostic: Parameters<typeof updateSettings>[0]["diagnostic"] = null;
  if (!d.skipDiagnostic) {
    const haveSections = d.lr1 != null && d.lr2 != null && d.rc != null;
    if (!haveSections && d.diagnosticScaledOverride == null) {
      return { error: "Enter your three section scores, a scaled score, or tick “I haven't taken a diagnostic yet”." };
    }
    const rawTotal = haveSections ? d.lr1! + d.lr2! + d.rc! : undefined;
    const total = d.lrTotalQuestions + d.rcTotalQuestions;
    const scaled = d.diagnosticScaledOverride ?? (rawTotal != null ? rawToScaled(rawTotal, total) : undefined);
    diagnostic = {
      pt: d.diagnosticPt,
      lr1: d.lr1,
      lr2: d.lr2,
      rc: d.rc,
      scaled,
      takenOn: format(new Date(), "yyyy-MM-dd"),
    };
  }

  await updateSettings({
    testDate: d.testDate,
    goalScore: d.goalScore,
    hoursPerWeek: d.hoursPerWeek,
    daysPerWeek: d.daysPerWeek,
    diagnostic,
    onboarded: true,
    startDate: format(new Date(), "yyyy-MM-dd"),
  });
  await regeneratePlan({ preserveCompleted: false });
  revalidatePath("/");
  revalidatePath("/plan");
  redirect("/plan");
}

const ChangeDateSchema = z.object({
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  hoursPerWeek: z.coerce.number().min(2).max(60).optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
});

export async function changePlanSettings(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ChangeDateSchema.safeParse({
    testDate: raw.undecided === "on" || !raw.testDate ? null : raw.testDate,
    hoursPerWeek: raw.hoursPerWeek || undefined,
    daysPerWeek: raw.daysPerWeek || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.testDate && d.testDate <= format(new Date(), "yyyy-MM-dd")) return { error: "Test date must be in the future." };
  await updateSettings({
    testDate: d.testDate,
    ...(d.hoursPerWeek != null ? { hoursPerWeek: d.hoursPerWeek } : {}),
    ...(d.daysPerWeek != null ? { daysPerWeek: d.daysPerWeek } : {}),
  });
  await regeneratePlan({ preserveCompleted: true });
  revalidatePath("/");
  revalidatePath("/plan");
  return undefined;
}

export async function toggleDay(day: string, completed: boolean) {
  const { markDay } = await import("@/lib/data/plan");
  await markDay(day, completed);
  revalidatePath("/plan");
  revalidatePath("/");
}
