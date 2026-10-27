import { readLessons } from "@/lib/content/load";
const { lessons, errors } = await readLessons();
for (const l of lessons) console.log(`${l.id.padEnd(28)} ${String(l.words).padStart(4)} words ${l.words > 600 ? "  <-- over 600" : ""}`);
if (errors.length) { console.error(errors); process.exit(1); }
console.log(`${lessons.length} lessons OK`);
