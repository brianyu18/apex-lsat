/**
 * Compiles every content/lessons/**\/*.mdx body with @mdx-js/mdx and reports
 * any file that fails to compile. Exit code 1 on any failure.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

const root = path.join(process.cwd(), "content", "lessons");
const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(".mdx")).map((f) => path.join(root, f)).sort();

let failed = 0;
for (const file of files) {
  const { content } = matter(await readFile(file, "utf8"));
  try {
    await compile(content, { development: false, remarkPlugins: [remarkGfm] });
    console.log(`ok    ${path.relative(process.cwd(), file)}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${path.relative(process.cwd(), file)}\n      ${(e as Error).message}`);
  }
}
console.log(`${files.length - failed}/${files.length} lessons compile`);
if (failed) process.exit(1);
