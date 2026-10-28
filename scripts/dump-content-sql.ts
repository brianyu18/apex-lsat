/**
 * Emits the bank (passages + questions) as idempotent SQL upserts, for loading
 * into a Postgres you can't reach with a client (e.g. via the Supabase SQL API).
 *   pnpm tsx scripts/dump-content-sql.ts > qa/content.sql
 */
import { getDb, schema } from "@/lib/db/client";

const q = (v: unknown): string => {
  if (v == null) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
};
const db = await getDb();
const passages = await db.select().from(schema.passages);
const questions = await db.select().from(schema.questions);
const out: string[] = [];
for (const p of passages) {
  out.push(
    `INSERT INTO passages (id, source, style, topic, comparative, title, paragraphs, paragraphs_b, role_map, low_res_summary, word_count) VALUES (${[p.id, p.source, p.style, p.topic, p.comparative, p.title, p.paragraphs, p.paragraphsB, p.roleMap, p.lowResSummary, p.wordCount].map(q).join(", ")}) ON CONFLICT (id) DO UPDATE SET style=EXCLUDED.style, topic=EXCLUDED.topic, comparative=EXCLUDED.comparative, title=EXCLUDED.title, paragraphs=EXCLUDED.paragraphs, paragraphs_b=EXCLUDED.paragraphs_b, role_map=EXCLUDED.role_map, low_res_summary=EXCLUDED.low_res_summary, word_count=EXCLUDED.word_count;`,
  );
}
for (const x of questions.filter((x) => x.source === "original")) {
  out.push(
    `INSERT INTO questions (id, source, section, type, logic_tags, difficulty, trap_patterns, passage_id, stimulus, stem, choices, answer, explanations, key_takeaway, prediction_hint, reserved_for_timed) VALUES (${[x.id, x.source, x.section, x.type, x.logicTags, x.difficulty, x.trapPatterns, x.passageId, x.stimulus, x.stem, x.choices, x.answer, x.explanations, x.keyTakeaway, x.predictionHint, x.reservedForTimed].map(q).join(", ")}) ON CONFLICT (id) DO UPDATE SET type=EXCLUDED.type, logic_tags=EXCLUDED.logic_tags, difficulty=EXCLUDED.difficulty, trap_patterns=EXCLUDED.trap_patterns, passage_id=EXCLUDED.passage_id, stimulus=EXCLUDED.stimulus, stem=EXCLUDED.stem, choices=EXCLUDED.choices, answer=EXCLUDED.answer, explanations=EXCLUDED.explanations, key_takeaway=EXCLUDED.key_takeaway, prediction_hint=EXCLUDED.prediction_hint, reserved_for_timed=EXCLUDED.reserved_for_timed;`,
  );
}
process.stdout.write(out.join("\n") + "\n");
process.exit(0);
