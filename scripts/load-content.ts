import { loadAll } from "@/lib/content/load";

/**
 * Loads lessons + question bank into the database. Invalid bank files are
 * skipped with a warning so one bad draft never blocks the app; pass --strict
 * (CI / release) to fail on any error.
 */
const strict = process.argv.includes("--strict");
const report = await loadAll();
console.log(`LR questions: ${report.lrQuestions}`);
console.log(`RC passages:  ${report.rcPassages} (${report.rcQuestions} questions)`);
console.log(`Lessons:      ${report.lessons}`);
if (report.errors.length) {
  console.error(`\n${report.errors.length} file(s) skipped:`);
  for (const e of report.errors) console.error(`  ${e.file}\n    ${e.message}`);
  if (strict) process.exit(1);
}
process.exit(0);
