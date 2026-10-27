"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { nextDue } from "@/lib/engine/srs";

export type ReviewState = { error?: string } | undefined;

const Schema = z.object({
  attemptId: z.string().min(1),
  errorType: z.enum(["misread", "logic_gap", "trap", "time_pressure", "careless", "guessed_right"]),
  errorSuggested: z.enum(["misread", "logic_gap", "trap", "time_pressure", "careless", "guessed_right"]).optional(),
  trapSubtype: z.string().optional(),
  whyChose: z.string().max(1000).optional(),
  whyRejectedRight: z.string().max(1000).optional(),
  howPredict: z.string().max(1000).optional(),
  killingWords: z.string().max(500).optional(),
  avoidNextTime: z.string().max(1000).optional(),
  takeaway: z.string().max(300).optional(),
  intent: z.enum(["save", "done"]),
});

export async function saveReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const raw = Object.fromEntries(fd.entries());
  const parsed = Schema.safeParse({ ...raw, errorSuggested: raw.errorSuggested || undefined, trapSubtype: raw.trapSubtype || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.intent === "done" && !(d.takeaway ?? "").trim()) return { error: "Write a one-line takeaway before marking it reviewed." };

  const db = await getDb();
  const existing = await db.select().from(schema.misses).where(eq(schema.misses.attemptId, d.attemptId));
  const box = existing[0]?.srsBox ?? 1;
  const patch = {
    errorType: d.errorType,
    errorSuggested: d.errorSuggested ?? null,
    trapSubtype: d.trapSubtype ?? null,
    whyChose: d.whyChose ?? null,
    whyRejectedRight: d.whyRejectedRight ?? null,
    howPredict: d.howPredict ?? null,
    killingWords: d.killingWords ?? null,
    avoidNextTime: d.avoidNextTime ?? null,
    takeaway: d.takeaway ?? null,
    ...(d.intent === "done" ? { reviewed: true, reviewedAt: new Date(), nextDue: existing[0]?.nextDue ?? nextDue(box) } : {}),
  };
  if (existing[0]) {
    await db.update(schema.misses).set(patch).where(eq(schema.misses.attemptId, d.attemptId));
  } else {
    const [att] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, d.attemptId));
    if (!att) return { error: "Attempt not found." };
    await db.insert(schema.misses).values({ attemptId: d.attemptId, questionId: att.questionId, srsBox: 1, nextDue: nextDue(1), ...patch });
  }
  revalidatePath("/review");
  revalidatePath(`/review/${d.attemptId}`);
  revalidatePath("/");
  if (d.intent === "done") redirect("/review");
  return undefined;
}
