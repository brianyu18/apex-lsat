/**
 * Build content/schools/schools.json from an ABA Standard 509 compilation.
 *   pnpm tsx scripts/ingest-509.ts <file.xlsx|.csv> [--year=2025] [--sheet=NAME]
 * Accepts the ABA "compilation – all schools" spreadsheet (any year's header
 * variants) or a CSV with the same columns. Prints what it mapped and skipped.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { parse509, type RawRow } from "@/lib/schools/ingest";

const file = process.argv[2];
if (!file) {
  console.error("usage: pnpm tsx scripts/ingest-509.ts <aba-509.xlsx|csv> [--year=2025] [--sheet=NAME]");
  process.exit(1);
}
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const year = Number(arg("year") ?? new Date().getFullYear());
const wb = XLSX.read(await readFile(file), { type: "buffer" });
const sheetName = arg("sheet") ?? wb.SheetNames.find((n) => /first.?year|admission|509|all/i.test(n)) ?? wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
// Some ABA sheets have a title row above the header: find the first row that mentions LSAT.
const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
const headerIdx = grid.findIndex((r) => Array.isArray(r) && r.some((c) => /lsat/i.test(String(c ?? ""))));
if (headerIdx < 0) {
  console.error(`No header row mentioning LSAT in sheet "${sheetName}". Sheets: ${wb.SheetNames.join(", ")}`);
  process.exit(1);
}
const headers = (grid[headerIdx] as unknown[]).map((h) => String(h ?? "").trim());
const rows: RawRow[] = (grid.slice(headerIdx + 1) as unknown[][]).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] as string | number | null | undefined])));
const { schools, skipped } = parse509(rows, year);
await mkdir(path.join("content", "schools"), { recursive: true });
await writeFile(path.join("content", "schools", "schools.json"), JSON.stringify(schools, null, 1));
console.log(`sheet "${sheetName}" · ${schools.length} schools written to content/schools/schools.json · ${skipped.length} skipped`);
for (const s of skipped.slice(0, 10)) console.log(`  skipped: ${s.name} (${s.reason})`);
console.log(`top by median LSAT: ${schools.slice(0, 5).map((s) => `${s.name} ${s.lsat50}`).join(" · ")}`);
process.exit(0);
