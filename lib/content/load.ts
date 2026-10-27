/**
 * Content loader: validates bank JSON and lesson MDX frontmatter, then upserts
 * into the database. Idempotent — running twice yields identical row counts.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { LessonFrontmatterSchema, LRQuestionSchema, RCPassageSchema, type LessonFrontmatter } from "./schema";

export interface LoadReport {
  lrQuestions: number;
  rcPassages: number;
  rcQuestions: number;
  lessons: number;
  errors: { file: string; message: string }[];
}

const ROOT = () => path.join(process.cwd(), "content");

async function listFiles(dir: string, ext: string): Promise<string[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(dir, { recursive: true });
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
}

function formatZod(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

export async function loadBank(report: LoadReport) {
  const db = await getDb();
  // LR
  for (const file of await listFiles(path.join(ROOT(), "bank", "lr"), ".json")) {
    let items: unknown[];
    try {
      const raw = JSON.parse(await readFile(file, "utf8"));
      items = Array.isArray(raw) ? raw : [raw];
    } catch (e) {
      report.errors.push({ file, message: `invalid JSON: ${(e as Error).message}` });
      continue;
    }
    for (const item of items) {
      const parsed = LRQuestionSchema.safeParse(item);
      if (!parsed.success) {
        report.errors.push({ file, message: `${(item as { id?: string })?.id ?? "?"}: ${formatZod(parsed.error)}` });
        continue;
      }
      const q = parsed.data;
      await db
        .insert(schema.questions)
        .values({
          id: q.id,
          source: "original",
          section: "LR",
          type: q.type,
          logicTags: q.logicTags,
          difficulty: q.difficulty,
          trapPatterns: q.trapPatterns,
          stimulus: q.stimulus,
          stem: q.stem,
          choices: q.choices,
          answer: q.answer,
          explanations: q.explanations,
          keyTakeaway: q.keyTakeaway,
          predictionHint: q.predictionHint ?? null,
          reservedForTimed: q.reservedForTimed ?? false,
        })
        .onConflictDoUpdate({
          target: schema.questions.id,
          set: {
            type: q.type,
            logicTags: q.logicTags,
            difficulty: q.difficulty,
            trapPatterns: q.trapPatterns,
            stimulus: q.stimulus,
            stem: q.stem,
            choices: q.choices,
            answer: q.answer,
            explanations: q.explanations,
            keyTakeaway: q.keyTakeaway,
            predictionHint: q.predictionHint ?? null,
            reservedForTimed: q.reservedForTimed ?? false,
          },
        });
      report.lrQuestions++;
    }
  }
  // RC
  for (const file of await listFiles(path.join(ROOT(), "bank", "rc"), ".json")) {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      report.errors.push({ file, message: `invalid JSON: ${(e as Error).message}` });
      continue;
    }
    const parsed = RCPassageSchema.safeParse(raw);
    if (!parsed.success) {
      report.errors.push({ file, message: formatZod(parsed.error) });
      continue;
    }
    const p = parsed.data;
    const wordCount = [...p.paragraphs, ...(p.paragraphsB ?? [])].join(" ").split(/\s+/).length;
    await db
      .insert(schema.passages)
      .values({
        id: p.id,
        source: "original",
        style: p.style,
        topic: p.topic,
        comparative: p.comparative,
        title: p.title,
        paragraphs: p.paragraphs,
        paragraphsB: p.paragraphsB ?? null,
        roleMap: p.roleMap,
        lowResSummary: p.lowResSummary,
        wordCount,
      })
      .onConflictDoUpdate({
        target: schema.passages.id,
        set: { style: p.style, topic: p.topic, comparative: p.comparative, title: p.title, paragraphs: p.paragraphs, paragraphsB: p.paragraphsB ?? null, roleMap: p.roleMap, lowResSummary: p.lowResSummary, wordCount },
      });
    report.rcPassages++;
    for (const q of p.questions) {
      await db
        .insert(schema.questions)
        .values({
          id: q.id,
          source: "original",
          section: "RC",
          type: q.type,
          logicTags: q.logicTags,
          difficulty: q.difficulty,
          trapPatterns: q.trapPatterns,
          passageId: p.id,
          stem: q.stem,
          choices: q.choices,
          answer: q.answer,
          explanations: q.explanations,
          keyTakeaway: q.keyTakeaway,
        })
        .onConflictDoUpdate({
          target: schema.questions.id,
          set: { type: q.type, logicTags: q.logicTags, difficulty: q.difficulty, trapPatterns: q.trapPatterns, passageId: p.id, stem: q.stem, choices: q.choices, answer: q.answer, explanations: q.explanations, keyTakeaway: q.keyTakeaway },
        });
      report.rcQuestions++;
    }
  }
}

export interface LessonMeta extends LessonFrontmatter {
  file: string;
  body: string;
  words: number;
}

/** Reads and validates all lessons from content/lessons (no DB). */
export async function readLessons(): Promise<{ lessons: LessonMeta[]; errors: { file: string; message: string }[] }> {
  const lessons: LessonMeta[] = [];
  const errors: { file: string; message: string }[] = [];
  for (const file of await listFiles(path.join(ROOT(), "lessons"), ".mdx")) {
    const src = await readFile(file, "utf8");
    const { data, content } = matter(src);
    const parsed = LessonFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      errors.push({ file, message: formatZod(parsed.error) });
      continue;
    }
    const words = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    lessons.push({ ...parsed.data, file, body: content, words });
  }
  lessons.sort((a, b) => a.unit - b.unit || a.order - b.order);
  return { lessons, errors };
}

export async function loadAll(): Promise<LoadReport> {
  const report: LoadReport = { lrQuestions: 0, rcPassages: 0, rcQuestions: 0, lessons: 0, errors: [] };
  await loadBank(report);
  const { lessons, errors } = await readLessons();
  report.lessons = lessons.length;
  report.errors.push(...errors);
  return report;
}

export async function bankCounts() {
  const db = await getDb();
  const rows = await db.execute(sql`select section, type, difficulty, count(*)::int as n from questions where source = 'original' group by 1,2,3`);
  return rows.rows as { section: string; type: string; difficulty: number; n: number }[];
}
