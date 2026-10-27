/**
 * QA for original LR items.
 *
 *   pnpm tsx scripts/gen/qa-lr.ts [--solve] [--solver=claude-cli|file] [files...]
 *
 * Gates (see scripts/gen/prompts/lr-spec.md):
 *  1. schema            Zod validation
 *  2. adversarial solve independent model picks the key (requires --solve)
 *  3. key balance       no letter > 26% of keys (batches ≥ 25)
 *  4. key length        key is longest choice in ≤ 40% of items
 *  5. duplicates        word 3-gram Jaccard between stimuli < 0.5
 *  6. distribution      report type + difficulty shares vs targets
 *
 * Solver backends
 *  - claude-cli: shells out to the local `claude -p` (uses the user's Claude subscription).
 *  - file: writes `qa/solve-requests.json`; an agent fills `qa/solve-answers.json` with {id: letter}.
 *          This is how in-session QA runs without an API key.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LRQuestionSchema, type LRQuestionInput } from "@/lib/content/schema";
import { DIFFICULTY_TARGET_SHARE, LR_TYPES, lrTypeShare, type Difficulty } from "@/lib/content/taxonomy";

const exec = promisify(execFile);
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")).map((a) => a.split("=")[0]));
const solverArg = args.find((a) => a.startsWith("--solver="))?.split("=")[1] ?? "file";
const files = args.filter((a) => !a.startsWith("--"));

const bankDir = path.join(process.cwd(), "content", "bank", "lr");
const qaDir = path.join(process.cwd(), "qa");

function trigrams(s: string): Set<string> {
  const w = s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
}
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

async function main() {
  const targets = files.length ? files : (await readdir(bankDir)).filter((f) => f.endsWith(".json")).map((f) => path.join(bankDir, f));
  const items: LRQuestionInput[] = [];
  const problems: string[] = [];

  for (const f of targets) {
    const raw = JSON.parse(await readFile(f, "utf8"));
    for (const it of Array.isArray(raw) ? raw : [raw]) {
      const p = LRQuestionSchema.safeParse(it);
      if (!p.success) {
        problems.push(`[schema] ${path.basename(f)} ${it?.id ?? "?"}: ${p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
        continue;
      }
      items.push(p.data);
    }
  }
  console.log(`Loaded ${items.length} valid item(s) from ${targets.length} file(s)`);

  // ids unique
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) problems.push(`[dup-id] ${it.id}`);
    seen.add(it.id);
  }

  // key balance
  const keyCount: Record<string, number> = {};
  for (const it of items) keyCount[it.answer] = (keyCount[it.answer] ?? 0) + 1;
  if (items.length >= 25) {
    for (const [k, n] of Object.entries(keyCount)) {
      if (n / items.length > 0.26) problems.push(`[key-balance] ${k} is the key in ${((n / items.length) * 100).toFixed(0)}% of items`);
    }
  }
  console.log("Key distribution:", keyCount);

  // key length bias
  let longest = 0;
  for (const it of items) {
    const lens = Object.entries(it.choices).map(([k, v]) => [k, v.length] as const).sort((a, b) => b[1] - a[1]);
    if (lens[0][0] === it.answer) longest++;
  }
  const longestShare = items.length ? longest / items.length : 0;
  console.log(`Key is longest choice: ${(longestShare * 100).toFixed(0)}%`);
  if (longestShare > 0.4) problems.push(`[key-length] key is the longest choice in ${(longestShare * 100).toFixed(0)}% of items (max 40%)`);

  // duplicates
  const grams = items.map((it) => trigrams(it.stimulus));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const s = jaccard(grams[i], grams[j]);
      if (s >= 0.5) problems.push(`[near-dup] ${items[i].id} ~ ${items[j].id} (${s.toFixed(2)})`);
    }

  // distribution report
  const byType: Record<string, number> = {};
  const byDiff: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const it of items) {
    byType[it.type] = (byType[it.type] ?? 0) + 1;
    byDiff[it.difficulty]++;
  }
  console.log("\nType distribution (actual / target):");
  for (const t of LR_TYPES) {
    const target = Math.round(lrTypeShare(t) * items.length);
    const actual = byType[t] ?? 0;
    const flag = Math.abs(actual - target) > 2 ? "  <-- off" : "";
    console.log(`  ${t.padEnd(30)} ${String(actual).padStart(3)} / ${String(target).padStart(3)}${flag}`);
  }
  console.log("Difficulty distribution (actual / target):");
  for (const d of [1, 2, 3, 4] as Difficulty[]) {
    console.log(`  L${d}: ${byDiff[d]} / ${Math.round(DIFFICULTY_TARGET_SHARE[d] * items.length)}`);
  }

  // adversarial solve
  if (flags.has("--solve")) {
    await mkdir(qaDir, { recursive: true });
    const requests = items.map((it) => ({ id: it.id, stimulus: it.stimulus, stem: it.stem, choices: it.choices }));
    if (solverArg === "claude-cli") {
      const answers: Record<string, string> = {};
      for (const r of requests) {
        const prompt = `You are an expert LSAT solver. Answer with a single letter A–E and nothing else.\n\n${r.stimulus}\n\n${r.stem}\n\n${Object.entries(r.choices).map(([k, v]) => `(${k}) ${v}`).join("\n")}`;
        try {
          const { stdout } = await exec("claude", ["-p", prompt, "--output-format", "text"], { timeout: 120_000 });
          const m = stdout.trim().match(/\b([A-E])\b/);
          answers[r.id] = m ? m[1] : "?";
          process.stdout.write(answers[r.id] === items.find((i) => i.id === r.id)!.answer ? "." : "x");
        } catch {
          answers[r.id] = "?";
          process.stdout.write("!");
        }
      }
      await writeFile(path.join(qaDir, "solve-answers.json"), JSON.stringify(answers, null, 2));
      console.log();
    } else {
      await writeFile(path.join(qaDir, "solve-requests.json"), JSON.stringify(requests, null, 2));
      console.log(`\nWrote ${requests.length} solve requests to qa/solve-requests.json. Have an independent solver write qa/solve-answers.json as {id: letter}, then re-run with --solve.`);
    }
    const ansPath = path.join(qaDir, "solve-answers.json");
    if (existsSync(ansPath)) {
      const answers = JSON.parse(await readFile(ansPath, "utf8")) as Record<string, string>;
      let agree = 0, total = 0;
      const disagreements: string[] = [];
      for (const it of items) {
        const a = answers[it.id];
        if (!a) continue;
        total++;
        if (a === it.answer) agree++;
        else disagreements.push(`  ${it.id}: key=${it.answer} solver=${a}`);
      }
      const rate = total ? agree / total : 0;
      console.log(`\nSolver agreement: ${agree}/${total} (${(rate * 100).toFixed(1)}%)`);
      if (disagreements.length) console.log(disagreements.join("\n"));
      if (total && rate < 0.95) problems.push(`[solver] agreement ${(rate * 100).toFixed(1)}% < 95%`);
      await writeFile(path.join(qaDir, "solve-report.json"), JSON.stringify({ agree, total, rate, disagreements }, null, 2));
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
