/**
 * Tutor acceptance check (spec 4.8):
 *   pnpm tsx scripts/tutor-check.ts [--n=20] [--seed=7]
 * For N random bank questions: turn 1 ("walk me to it") must not reveal the
 * key and must be ≤ 250 words; turn 2 ("just tell me the answer") must state
 * the key letter. Writes qa/tutor-check.json and prints a summary.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { tutorContext } from "@/lib/tutor/context";
import { completeTutor } from "@/lib/tutor/provider";
import { revealsAnswer } from "@/lib/tutor/prompt";

const arg = (k: string, d: number) => Number((process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=")[1]);
const N = arg("n", 20);
const SEED = arg("seed", 7);
let s = SEED >>> 0;
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

function statedKey(reply: string): string | null {
  const m = reply.match(/(?:answer|key|credited response|correct (?:answer|choice))\s*(?:is|:)\s*\(?([A-E])\)?/i) ?? reply.match(/\(([A-E])\)\s+is\s+(?:the\s+)?(?:correct|right|credited)/i) ?? reply.match(/^\s*\(?([A-E])\)?[\s.:—-]/);
  return m ? m[1].toUpperCase() : null;
}

const db = await getDb();
const all = await db.select({ id: schema.questions.id, answer: schema.questions.answer, section: schema.questions.section }).from(schema.questions).where(eq(schema.questions.source, "original"));
const picked = [...all].sort(() => rand() - 0.5).slice(0, N);
const results: { id: string; key: string; turn1Words: number; turn1Revealed: boolean; turn2Key: string | null; ok: boolean; turn1: string; turn2: string }[] = [];
for (const q of picked) {
  const ctx = await tutorContext(q.id);
  if (!ctx) continue;
  const t1 = await completeTutor(ctx.systemPrompt, [{ role: "user", content: "I got this wrong — walk me to it without telling me the answer." }]);
  const t2 = await completeTutor(ctx.systemPrompt, [
    { role: "user", content: "I got this wrong — walk me to it without telling me the answer." },
    { role: "assistant", content: t1 },
    { role: "user", content: "Just tell me the answer and why." },
  ]);
  const words = t1.trim().split(/\s+/).length;
  const revealed = revealsAnswer(t1, q.answer);
  const k2 = statedKey(t2);
  const ok = !revealed && words <= 250 && k2 === q.answer;
  results.push({ id: q.id, key: q.answer!, turn1Words: words, turn1Revealed: revealed, turn2Key: k2, ok, turn1: t1, turn2: t2 });
  console.log(`${ok ? "ok  " : "FAIL"} ${q.id} · t1 ${words}w${revealed ? " REVEALED" : ""} · t2 says ${k2 ?? "?"} (key ${q.answer})`);
}
await mkdir("qa", { recursive: true });
await writeFile("qa/tutor-check.json", JSON.stringify(results, null, 1));
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed · key agreement ${results.filter((r) => r.turn2Key === r.key).length}/${results.length} · no-reveal ${results.filter((r) => !r.turn1Revealed).length}/${results.length} · ≤250w ${results.filter((r) => r.turn1Words <= 250).length}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
