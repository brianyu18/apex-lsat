import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DeckSchema, type Deck } from "./schema";

const GROUP_ORDER = { foundations: 0, lr: 1, rc: 2 } as const;

/** Reads and validates every deck in content/decks. Invalid files are reported, not thrown. */
export async function readDecks(dir = path.join(process.cwd(), "content", "decks")): Promise<{ decks: Deck[]; errors: { file: string; message: string }[] }> {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return { decks: [], errors: [] };
  }
  const decks: Deck[] = [];
  const errors: { file: string; message: string }[] = [];
  for (const f of files) {
    try {
      const r = DeckSchema.safeParse(JSON.parse(await readFile(path.join(dir, f), "utf8")));
      if (!r.success) errors.push({ file: f, message: r.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      else if (r.data.id !== f.replace(/\.json$/, "")) errors.push({ file: f, message: `id "${r.data.id}" does not match the file name` });
      else decks.push(r.data);
    } catch (e) {
      errors.push({ file: f, message: (e as Error).message });
    }
  }
  decks.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.order - b.order);
  return { decks, errors };
}
