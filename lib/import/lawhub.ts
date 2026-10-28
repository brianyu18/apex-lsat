/**
 * LawHub import — official PrepTest results, by reference only.
 *
 * We never store official question text. An import creates `official_ref`
 * question rows keyed (pt, sectionNumber, number) with the student's own
 * type tag (optional) and records attempts, so official tests count toward
 * the score range, analytics and the review inbox.
 *
 * Accepted formats (pasted or uploaded):
 *  1. Simple grid — one section per block, one line per question:
 *       PT 158
 *       S1 LR: 1 A C, 2 B B, 3 D D, ...        → "<n> <your> <key>" (correct iff equal)
 *       S2 RC: 1 C C, ...
 *     or   S1 LR: 1 ✓, 2 ✗, 3 ✓ ...            → correctness only
 *  2. LawHub "Score Report" CSV export columns (best effort):
 *       Section, Question, Your Answer, Correct Answer, Time (optional, seconds or m:ss)
 */

export interface ImportedQuestion {
  sectionNumber: number;
  sectionKind: "LR" | "RC";
  number: number;
  yourAnswer: string | null;
  key: string | null;
  correct: boolean;
  seconds: number | null;
}
export interface ImportedTest {
  pt: number;
  scaled?: number | null;
  sections: { sectionNumber: number; kind: "LR" | "RC"; scored: boolean; questions: ImportedQuestion[] }[];
}

const LETTER = /^[A-E]$/i;

export function parseLawHub(text: string, opts: { pt?: number; scaled?: number | null } = {}): ImportedTest {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let pt = opts.pt ?? 0;
  const sections: ImportedTest["sections"] = [];
  let cur: ImportedTest["sections"][number] | null = null;

  const isCsvHeader = (l: string) => /section/i.test(l) && /question/i.test(l) && /,/.test(l);
  if (lines.some(isCsvHeader)) {
    const hi = lines.findIndex(isCsvHeader);
    const cols = lines[hi].split(",").map((c) => c.trim().toLowerCase());
    // check names in priority order so "correct answer" wins over a column that merely contains "answer"
    const col = (names: string[]) => {
      for (const n of names) {
        const i = cols.findIndex((c) => c.includes(n));
        if (i >= 0) return i;
      }
      return -1;
    };
    const iSec = col(["section"]), iQ = col(["question", "#"]), iYour = col(["your", "response", "selected"]), iKey = col(["correct answer", "key", "correct"]), iTime = col(["time", "seconds", "duration"]);
    for (const l of lines.slice(hi + 1)) {
      const parts = l.split(",").map((c) => c.trim());
      if (parts.length < 2) continue;
      const secRaw = parts[iSec] ?? "";
      const secNum = Number((secRaw.match(/\d+/) ?? ["0"])[0]) || sections.length + 1;
      const kind: "LR" | "RC" = /rc|reading/i.test(secRaw) ? "RC" : "LR";
      if (!cur || cur.sectionNumber !== secNum) {
        cur = { sectionNumber: secNum, kind, scored: true, questions: [] };
        sections.push(cur);
      }
      const n = Number(parts[iQ]);
      if (!n) continue;
      const your = (parts[iYour] ?? "").toUpperCase();
      const key = (parts[iKey] ?? "").toUpperCase();
      const secs = iTime >= 0 ? parseTime(parts[iTime]) : null;
      cur.questions.push({ sectionNumber: secNum, sectionKind: kind, number: n, yourAnswer: LETTER.test(your) ? your : null, key: LETTER.test(key) ? key : null, correct: LETTER.test(your) && LETTER.test(key) ? your === key : /✓|correct|true|1/i.test(parts[iKey] ?? "") && !LETTER.test(key), seconds: secs });
    }
  } else {
    for (const l of lines) {
      const ptm = l.match(/^(?:PT|PrepTest)\s*(\d+)/i);
      if (ptm) {
        pt = Number(ptm[1]);
        continue;
      }
      const sm = l.match(/^S(?:ection)?\s*(\d+)\s*(LR|RC)?\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/i);
      if (sm) {
        const secNum = Number(sm[1]);
        const kind: "LR" | "RC" = (sm[2] ?? "LR").toUpperCase() === "RC" ? "RC" : "LR";
        const scored = !/unscored|experimental|exp/i.test(sm[3] ?? "");
        cur = { sectionNumber: secNum, kind, scored, questions: [] };
        sections.push(cur);
        parseItems(sm[4], cur);
        continue;
      }
      if (cur) parseItems(l, cur);
    }
  }
  if (!pt) throw new Error("Couldn't find the PrepTest number. Start with a line like “PT 158”.");
  if (!sections.length || sections.every((s) => !s.questions.length)) throw new Error("No questions parsed. Use “S1 LR: 1 A C, 2 B B, …” (question, your answer, key) or “1 ✓, 2 ✗”.");
  return { pt, scaled: opts.scaled ?? null, sections };
}

function parseItems(text: string, sec: ImportedTest["sections"][number]) {
  for (const raw of text.split(/[,;]+/)) {
    const t = raw.trim();
    if (!t) continue;
    const m = t.match(/^(\d+)\s*[:.)]?\s*(.*)$/);
    if (!m) continue;
    const n = Number(m[1]);
    const rest = m[2].trim().toUpperCase().split(/\s+/).filter(Boolean);
    let your: string | null = null, key: string | null = null, correct = false, seconds: number | null = null;
    const marks = rest.filter((x) => /^[✓✔X✗✘-]$/.test(x) || /^(R|W|C|I|BLANK)$/.test(x));
    const letters = rest.filter((x) => LETTER.test(x));
    const times = rest.filter((x) => /^\d+(?::\d\d)?S?$/.test(x));
    if (letters.length >= 2) {
      your = letters[0];
      key = letters[1];
      correct = your === key;
    } else if (letters.length === 1 && marks.length) {
      your = letters[0];
      correct = /^[✓✔RC]$/.test(marks[0]);
    } else if (marks.length) {
      correct = /^[✓✔RC]$/.test(marks[0]);
      if (/^(BLANK|-)$/.test(marks[0])) your = null;
    } else if (letters.length === 1) {
      // only a key given — treat as correct when the user marks correct separately; otherwise unknown → assume blank
      key = letters[0];
    }
    if (times.length) seconds = parseTime(times[0]);
    sec.questions.push({ sectionNumber: sec.sectionNumber, sectionKind: sec.kind, number: n, yourAnswer: your, key, correct, seconds });
  }
}

function parseTime(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.trim().toLowerCase().replace(/s$/, "");
  if (/^\d+:\d\d$/.test(t)) {
    const [m, sec] = t.split(":").map(Number);
    return m * 60 + sec;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function summarize(t: ImportedTest) {
  const scored = t.sections.filter((s) => s.scored);
  const total = scored.reduce((a, s) => a + s.questions.length, 0);
  const correct = scored.reduce((a, s) => a + s.questions.filter((q) => q.correct).length, 0);
  return { total, correct, sections: t.sections.map((s) => ({ n: s.sectionNumber, kind: s.kind, scored: s.scored, total: s.questions.length, correct: s.questions.filter((q) => q.correct).length })) };
}
