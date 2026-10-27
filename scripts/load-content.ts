import { loadAll } from "@/lib/content/load";

const report = await loadAll();
console.log(`LR questions: ${report.lrQuestions}`);
console.log(`RC passages:  ${report.rcPassages} (${report.rcQuestions} questions)`);
console.log(`Lessons:      ${report.lessons}`);
if (report.errors.length) {
  console.error(`\n${report.errors.length} error(s):`);
  for (const e of report.errors) console.error(`  ${e.file}\n    ${e.message}`);
  process.exit(1);
}
process.exit(0);
