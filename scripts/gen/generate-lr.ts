/**
 * Reproducible LR item generation via the local `claude` CLI (subscription auth).
 *
 *   pnpm tsx scripts/gen/generate-lr.ts --type=flaw --difficulty=3 --n=5 --out=content/bank/lr/batch-xx.json
 *
 * The in-session authoring done by Claude Code follows the same spec
 * (scripts/gen/prompts/lr-spec.md); this script exists so Brian can extend
 * the bank later without an API key. Items still have to pass qa-lr.ts.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LRQuestionSchema } from "@/lib/content/schema";

const exec = promisify(execFile);
const arg = (k: string, d?: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;

const type = arg("type");
const difficulty = Number(arg("difficulty", "2"));
const n = Number(arg("n", "5"));
const out = arg("out", `content/bank/lr/gen-${type}-${Date.now()}.json`)!;
const topics = arg("topics", "varied");
if (!type) {
  console.error("--type is required");
  process.exit(1);
}

const spec = await readFile(path.join(process.cwd(), "scripts", "gen", "prompts", "lr-spec.md"), "utf8");
const prompt = `${spec}

---
TASK: Write ${n} original LSAT Logical Reasoning items of type "${type}" at difficulty ${difficulty}. Topics: ${topics}. Vary key letters. Output ONLY a JSON array of items in the JSON shape above, no prose, no markdown fences. Ids must be "lr-${type}-<unique-slug>".`;

const { stdout } = await exec("claude", ["-p", prompt, "--output-format", "text"], { timeout: 600_000, maxBuffer: 20 * 1024 * 1024 });
const text = stdout.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
let items: unknown[];
try {
  items = JSON.parse(text);
} catch {
  console.error("Model output was not valid JSON:\n", text.slice(0, 2000));
  process.exit(1);
}
const good = [];
for (const it of items) {
  const p = LRQuestionSchema.safeParse(it);
  if (p.success) good.push(p.data);
  else console.warn(`dropped ${(it as { id?: string })?.id}: ${p.error.issues[0]?.path.join(".")} ${p.error.issues[0]?.message}`);
}
await writeFile(path.join(process.cwd(), out), JSON.stringify(good, null, 2) + "\n");
console.log(`Wrote ${good.length}/${items.length} items to ${out}. Next: pnpm tsx scripts/gen/qa-lr.ts --solve --solver=claude-cli ${out}`);
