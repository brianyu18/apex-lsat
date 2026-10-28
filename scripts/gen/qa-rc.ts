/**
 * QA for original RC passage sets.
 *
 *   pnpm tsx scripts/gen/qa-rc.ts [--solve] [files...]
 *
 * Gates: schema · word counts · one main_point per set (+ relationship for comparative)
 *        · key balance · key length · near-duplicate paragraphs · distribution report
 *        · blind solver agreement (with --solve; same file protocol as qa-lr.ts).
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { RCPassageSchema, type RCPassageInput } from "@/lib/content/schema";
import { RC_QTYPES, RC_STYLES, RC_TOPICS } from "@/lib/content/taxonomy";

const args = process.argv.slice(2);
const solve = args.includes("--solve");
const files = args.filter((a) => !a.startsWith("--"));
const bankDir = path.join(process.cwd(), "content", "bank", "rc");
const qaDir = path.join(process.cwd(), "qa");

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
function trigrams(s: string) {
  const w = s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
}
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
};

async function main() {
  const targets = files.length ? files : (await readdir(bankDir).catch(() => [])).filter((f) => f.endsWith(".json")).map((f) => path.join(bankDir, f));
  const sets: RCPassageInput[] = [];
  const problems: string[] = [];
  for (const f of targets) {
    const raw = JSON.parse(await readFile(f, "utf8"));
    const p = RCPassageSchema.safeParse(raw);
    if (!p.success) {
      problems.push(`[schema] ${path.basename(f)}: ${p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      continue;
    }
    sets.push(p.data);
  }
  console.log(`Loaded ${sets.length} valid passage set(s) from ${targets.length} file(s)`);

  const qs = sets.flatMap((s) => s.questions.map((q) => ({ ...q, setId: s.id })));
  // word counts
  for (const s of sets) {
    const wa = words(s.paragraphs.join(" "));
    const wb = s.paragraphsB ? words(s.paragraphsB.join(" ")) : 0;
    const total = wa + wb;
    if (!s.comparative && (wa < 400 || wa > 540)) problems.push(`[words] ${s.id}: ${wa} words (want 420–520)`);
    if (s.comparative && (total < 400 || total > 560)) problems.push(`[words] ${s.id}: ${total} words combined (want 420–520)`);
    const mp = s.questions.filter((q) => q.type === "main_point").length;
    if (mp !== 1) problems.push(`[structure] ${s.id}: ${mp} main_point questions (want 1)`);
    if (s.comparative && !s.questions.some((q) => q.type === "relationship")) problems.push(`[structure] ${s.id}: comparative set needs a relationship question`);
  }
  // ids
  const ids = new Set<string>();
  for (const q of qs) {
    if (ids.has(q.id)) problems.push(`[dup-id] ${q.id}`);
    ids.add(q.id);
  }
  // key balance / length
  const keyCount: Record<string, number> = {};
  let longest = 0;
  for (const q of qs) {
    keyCount[q.answer] = (keyCount[q.answer] ?? 0) + 1;
    const lens = Object.entries(q.choices).sort((a, b) => b[1].length - a[1].length);
    if (lens[0][0] === q.answer) longest++;
  }
  console.log("Key distribution:", keyCount);
  if (qs.length >= 25) for (const [k, n] of Object.entries(keyCount)) if (n / qs.length > 0.26) problems.push(`[key-balance] ${k} is key in ${Math.round((n / qs.length) * 100)}%`);
  const ls = qs.length ? longest / qs.length : 0;
  console.log(`Key is longest choice: ${Math.round(ls * 100)}%`);
  if (ls > 0.4) problems.push(`[key-length] key is longest in ${Math.round(ls * 100)}% (max 40%)`);
  // near-dup paragraphs across sets
  const paras = sets.flatMap((s) => [...s.paragraphs, ...(s.paragraphsB ?? [])].map((p) => ({ id: s.id, g: trigrams(p) })));
  for (let i = 0; i < paras.length; i++)
    for (let j = i + 1; j < paras.length; j++)
      if (paras[i].id !== paras[j].id && jaccard(paras[i].g, paras[j].g) >= 0.4) problems.push(`[near-dup] ${paras[i].id} ~ ${paras[j].id}`);
  // distribution
  const byStyle: Record<string, number> = {}, byTopic: Record<string, number> = {}, byType: Record<string, number> = {}, byDiff: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const s of sets) {
    byStyle[s.style] = (byStyle[s.style] ?? 0) + 1;
    byTopic[s.topic] = (byTopic[s.topic] ?? 0) + 1;
  }
  for (const q of qs) {
    byType[q.type] = (byType[q.type] ?? 0) + 1;
    byDiff[q.difficulty]++;
  }
  console.log(`\nSets: ${sets.length} (${sets.filter((s) => s.comparative).length} comparative) · Questions: ${qs.length}`);
  console.log("Styles:", RC_STYLES.map((s) => `${s}=${byStyle[s] ?? 0}`).join(" "));
  console.log("Topics:", RC_TOPICS.map((t) => `${t}=${byTopic[t] ?? 0}`).join(" "));
  console.log("Question types:", RC_QTYPES.map((t) => `${t}=${byType[t] ?? 0}`).join(" "));
  console.log("Difficulty:", byDiff);

  if (solve) {
    await mkdir(qaDir, { recursive: true });
    const requests = sets.flatMap((s) =>
      s.questions.map((q) => ({ id: q.id, passage: { title: s.title, paragraphs: s.paragraphs, paragraphsB: s.paragraphsB ?? null }, stem: q.stem, choices: q.choices })),
    );
    await writeFile(path.join(qaDir, "solve-requests-rc.json"), JSON.stringify(requests, null, 1));
    console.log(`\nWrote ${requests.length} RC solve requests to qa/solve-requests-rc.json (answers → qa/solve-answers-rc.json as {id: letter}).`);
    const ansPath = path.join(qaDir, "solve-answers-rc.json");
    if (existsSync(ansPath)) {
      const answers = JSON.parse(await readFile(ansPath, "utf8")) as Record<string, string>;
      let agree = 0, total = 0;
      const dis: string[] = [];
      for (const q of qs) {
        const a = answers[q.id];
        if (!a) continue;
        total++;
        if (a === q.answer) agree++;
        else dis.push(`  ${q.id}: key=${q.answer} solver=${a}`);
      }
      const rate = total ? agree / total : 0;
      console.log(`Solver agreement: ${agree}/${total} (${(rate * 100).toFixed(1)}%)`);
      if (dis.length) console.log(dis.join("\n"));
      if (total && rate < 0.95) problems.push(`[solver] agreement ${(rate * 100).toFixed(1)}% < 95%`);
    }
  }

  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log("  " + p);
    process.exit(1);
  }
  console.log("\nQA passed.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
