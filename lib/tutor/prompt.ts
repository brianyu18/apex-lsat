/**
 * Grounded tutor prompt. Pure: takes the question, the student's attempt and
 * history, and a lesson excerpt; returns the system prompt and the first
 * grounding block. The tutor is Socratic — it never leads with the answer,
 * keeps replies short, cites the lesson it is drawing on, and says when it is
 * unsure. For official (LawHub) questions no text is stored, so the student
 * supplies the gist in chat and the tutor works from that.
 */
export interface TutorQuestion {
  id: string;
  source: "original" | "official_ref";
  section: "LR" | "RC";
  type: string;
  logicTags: string[];
  difficulty: number;
  stimulus: string | null;
  stem: string | null;
  choices: Record<string, string> | null;
  answer: string | null;
  explanations: Record<string, string> | null;
  trapPatterns: Record<string, string> | null;
  keyTakeaway?: string | null;
  officialRef?: { pt: number; section: number; number: number } | null;
  /** official_ref only: the student's own summary */
  gist?: string | null;
  passage?: { title: string; paragraphs: string[]; paragraphsB: string[] | null } | null;
}

export interface TutorAttempt {
  answer: string | null;
  correct: boolean | null;
  seconds: number | null;
  confidence: string | null;
  changedFrom: string | null;
  brAnswer?: string | null;
  mode: string;
}

export interface TutorHistory {
  /** counted accuracy on this type, and n */
  typeAccuracy: { n: number; correct: number } | null;
  /** error-type counts on this type from reviewed misses */
  errorTypes: Record<string, number>;
  /** previous journal takeaways on this type (most recent first, short) */
  takeaways: string[];
}

export interface TutorLesson {
  id: string;
  title: string;
  excerpt: string; // ≤ ~1500 chars of the lesson body, plain text
}

export const TUTOR_RULES = `You are the Apex LSAT tutor: a patient, exacting LSAT coach who teaches by asking.

Rules you never break:
1. Never state or reveal the correct answer letter, and never confirm or deny a letter the student proposes, unless the student explicitly asks you to just tell them the answer (e.g. "just tell me", "what's the answer", "give me the key"). Until then, lead them to it with one question at a time.
2. Keep every reply under 250 words. One idea per reply. Ask exactly one question at the end, unless you are wrapping up.
3. Ground everything in the stimulus and choices as given. Quote the exact words that matter ("because", "unless", "most", "some") rather than paraphrasing.
4. When you draw on a method, name the lesson it comes from in the form "(Lesson: <title>)". Do not invent lessons.
5. If the student's reasoning is right, say so plainly and move on; do not pad with praise.
6. If you are not certain about something — for example an official question whose text you only have as the student's summary — say what you are unsure about rather than guessing.
7. Use the student's own data: their answer, confidence, time, and error history. If they picked a trap, make them find the words that kill it themselves.
8. Plain prose. No bullet lists longer than three items, no headers, no emoji.
9. When the student asks for the answer outright, give the letter, the one-sentence reason it is right, and the one-sentence reason their pick (if wrong) is wrong — then stop.`;

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export function buildGrounding(q: TutorQuestion, attempt: TutorAttempt | null, history: TutorHistory | null, lesson: TutorLesson | null): string {
  const parts: string[] = [];
  parts.push(`QUESTION ${q.id} · ${q.section} · type: ${q.type} · difficulty L${q.difficulty}${q.logicTags.length ? ` · logic tags: ${q.logicTags.join(", ")}` : ""}`);
  if (q.source === "official_ref") {
    parts.push(`This is an OFFICIAL LSAT question (PrepTest ${q.officialRef?.pt ?? "?"}, section ${q.officialRef?.section ?? "?"}, question ${q.officialRef?.number ?? "?"}). Its text is NOT stored here. ${q.gist ? `The student's own gist of it: "${q.gist}".` : "The student has not written a gist yet."} They may paste or summarize the stimulus, stem and choices in chat; work only from what they give you, never reproduce LSAC text from memory, and say so if something is missing.${q.answer ? ` Recorded key: ${q.answer}.` : ""}`);
  } else {
    if (q.passage) {
      parts.push(`PASSAGE${q.passage.title ? ` — ${q.passage.title}` : ""}:\n${q.passage.paragraphs.map((p, i) => `[${i + 1}] ${p}`).join("\n")}${q.passage.paragraphsB ? `\nPASSAGE B:\n${q.passage.paragraphsB.map((p, i) => `[B${i + 1}] ${p}`).join("\n")}` : ""}`);
    }
    if (q.stimulus) parts.push(`STIMULUS:\n${q.stimulus}`);
    parts.push(`STEM: ${q.stem ?? ""}`);
    parts.push(`CHOICES:\n${LETTERS.map((l) => `(${l}) ${q.choices?.[l] ?? ""}`).join("\n")}`);
    parts.push(`ANSWER KEY (for you only — never reveal unless asked outright): ${q.answer ?? "?"}`);
    if (q.explanations) parts.push(`AUTHOR'S EXPLANATIONS (for you only):\n${LETTERS.map((l) => `(${l}) ${q.explanations?.[l] ?? ""}`).join("\n")}`);
    if (q.trapPatterns && Object.keys(q.trapPatterns).length) parts.push(`TRAP PATTERNS: ${Object.entries(q.trapPatterns).map(([l, t]) => `${l}=${t}`).join(", ")}`);
    if (q.keyTakeaway) parts.push(`KEY TAKEAWAY: ${q.keyTakeaway}`);
  }
  if (attempt) {
    parts.push(`STUDENT'S ATTEMPT (${attempt.mode}): picked ${attempt.answer ?? "nothing (blank)"}${attempt.changedFrom ? ` after changing from ${attempt.changedFrom}` : ""} · ${attempt.correct == null ? "unscored" : attempt.correct ? "correct" : "wrong"} · ${attempt.seconds != null ? `${Math.round(attempt.seconds)} s` : "time unknown"} · confidence: ${attempt.confidence ?? "not given"}${attempt.brAnswer ? ` · blind-review answer: ${attempt.brAnswer}` : ""}`);
  }
  if (history) {
    const acc = history.typeAccuracy && history.typeAccuracy.n ? `${Math.round((history.typeAccuracy.correct / history.typeAccuracy.n) * 100)}% over ${history.typeAccuracy.n} on this type` : "no history on this type yet";
    const errs = Object.entries(history.errorTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(", ");
    parts.push(`STUDENT'S HISTORY: ${acc}${errs ? ` · past error types: ${errs}` : ""}${history.takeaways.length ? `\nTheir own past takeaways on this type:\n${history.takeaways.map((t) => `- ${t}`).join("\n")}` : ""}`);
  }
  if (lesson) parts.push(`RELEVANT LESSON — "${lesson.title}" (${lesson.id}):\n${lesson.excerpt}`);
  return parts.join("\n\n");
}

export function buildSystemPrompt(grounding: string): string {
  return `${TUTOR_RULES}\n\n=== GROUNDING (private context; the student cannot see this block) ===\n${grounding}\n=== END GROUNDING ===`;
}

/** Render a chat transcript as one prompt for a single-turn CLI call. */
export function renderTranscript(messages: { role: "user" | "assistant"; content: string }[]): string {
  const lines = messages.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content.trim()}`);
  return `${lines.join("\n\n")}\n\nTutor:`;
}

/** Strip MDX to readable text for the lesson excerpt. */
export function lessonExcerpt(body: string, maxChars = 1500): string {
  const text = body
    .replace(/^---[\s\S]*?---/, "")
    .replace(/<[A-Z][A-Za-z]*[\s\S]*?(\/>|<\/[A-Z][A-Za-z]*>)/g, "")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).replace(/\s+\S*$/, "")}…` : text;
}

/** Did the reply reveal a key letter? Used by the QA script and as a guard for first turns. */
export function revealsAnswer(reply: string, key: string | null): boolean {
  if (!key) return false;
  const k = key.toUpperCase();
  const patterns = [
    new RegExp(`\\(${k}\\)\\s+is\\s+(the\\s+)?(correct|right|answer|credited)`, "i"),
    new RegExp(`(answer|key|credited response)\\s+is\\s+\\(?${k}\\)?\\b`, "i"),
    new RegExp(`\\b${k}\\s+is\\s+(the\\s+)?(correct|right)\\s+(answer|choice|one)`, "i"),
    new RegExp(`correct\\s+(answer|choice)\\s+(is|:)\\s+\\(?${k}\\)?\\b`, "i"),
    new RegExp(`go\\s+with\\s+\\(?${k}\\)?\\b`, "i"),
  ];
  return patterns.some((p) => p.test(reply));
}
