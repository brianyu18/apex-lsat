# Apex LSAT — Reading Comprehension passage specification

Every original RC passage set must be indistinguishable in form and rigor from a released LSAT set. This is the contract for authoring and for `scripts/gen/qa-rc.ts`.

## Passage form
- **Length**: 420–520 words for a single passage; comparative sets 200–280 words each (A and B), total 420–520.
- **Paragraphs**: 3–5 for single (each ≥ 80 words); 2–3 each for comparative.
- **Register**: dense academic prose from a journal, book review, or law review; long sentences with subordinate clauses; hedges ("it has been suggested", "to some extent"); technical vocabulary defined in context; no real living people, no copyrighted LSAT text. Invented scholars, artists, species, statutes and places are fine (and preferred).
- **Topics** (`topic`): `law` (legal theory, doctrine, jurisprudence, legal history), `humanities` (literature, art, music, philosophy, history), `social_science` (economics, anthropology, sociology, psychology, linguistics), `natural_science` (biology, geology, physics, chemistry, astronomy, medicine). Each batch balances the four.
- **Styles** (`style`): `critique_debate` (author evaluates a view or a dispute), `single_position` (author advances one thesis), `phenomenon_hypothesis` (observation → competing explanations → author's verdict), `problem_analysis` (problem → proposed solutions → assessment), `spotlight` (a person's or work's contribution, reassessed). Comparative sets (`comparative: true`): Passage A and B on one subject with a defined relationship — generalization/instance, principle/application, point/counterpoint, or two angles.
- **Structure markers to include deliberately**: at least one viewpoint other than the author's; at least one tone/attitude cue (qualified approval, skepticism, etc.); at least one pivot word (however, yet, although); one paragraph whose function is support/example rather than claim.

## Role map (`roleMap`)
- `paragraphs`: one role per paragraph from `context | main_point | support | counterpoint | example | concession | implication | transition`.
- `viewpoints`: every named view in the passage — `{ who, position, authorAgrees: true|false|null }` (`null` = author neutral/undetermined).
- `tone`: ≤ 8 words ("qualified approval", "skeptical but respectful", "neutral exposition").
- `lowResSummary`: ≤ 25 words, what a 175+ reader would say the passage is doing ("Author rejects the standard economic reading of X in favor of a cultural one").

## Questions
5–8 per set, following the RC type frequencies: `stated` (≈2), `author_perspective` (≈1), `main_point` (1), `purpose_in_context` (≈1), `meaning_in_context`, `other_perspective`, `purpose_of_passage`, `weaken_strengthen_evaluate`, `analogy`, `application`, `author_attitude`, `principle`, `purpose_of_paragraph`, `organization`; comparative sets must include `relationship` and may include `approach`. Every set has exactly one `main_point` question. Use canonical stems:

| type | stem |
|---|---|
| main_point | "Which one of the following most accurately expresses the main point of the passage?" |
| purpose_of_passage | "The primary purpose of the passage is to" |
| stated | "According to the passage, …" / "The passage states that …" |
| author_perspective | "It can be inferred from the passage that the author would be most likely to agree with which one of the following?" / "The passage most strongly suggests that…" |
| other_perspective | "The passage suggests that [the critics / X] would be most likely to agree that" |
| author_attitude | "The author's attitude toward X can most accurately be described as" |
| purpose_in_context | "The author mentions X primarily in order to" |
| purpose_of_paragraph | "The primary function of the second paragraph is to" |
| meaning_in_context | "Which one of the following most accurately expresses the meaning of 'X' as used in line …?" → phrase as "as it is used in the passage" (no line numbers). |
| organization | "Which one of the following most accurately describes the organization of the passage?" |
| analogy | "Which one of the following is most analogous to X as described in the passage?" |
| application | "Which one of the following, if true, would most support/undermine…" style application to a new case, or "would the author most likely consider an example of" |
| weaken_strengthen_evaluate | "Which one of the following, if true, would most weaken the author's argument…" |
| principle | "Which one of the following principles underlies the author's reasoning…" |
| relationship (comparative) | "Which one of the following most accurately describes the relationship between the two passages?" |
| approach (comparative) | "Passage A and passage B differ in that only passage A…" / "Both passages are primarily concerned with…" |

- **Choices**: five, 6–30 words, parallel in form.
- **Key**: provable from the text; `evidence` lists the 0-based paragraph indexes that support it.
- **Wrong answers**: each carries a trap pattern (`out_of_scope`, `extreme`, `opposite`, `half_right`, `wrong_part` (right idea, wrong paragraph/viewpoint), `shell_game` (nearby concept swap), `comparison_shift`, `true_but_irrelevant`, `wrong_force`, `reversal`), ≥ 3 distinct per question; explanations quote the killing words or point to the paragraph that contradicts.
- **Difficulty** 1–4 using the same rubric as LR; target per set: one or two L1, two or three L2, one or two L3, zero or one L4. `stated` items are usually L1–2; inference and comparative/analogy items carry the L3–4s.
- **Key letters** balanced across the batch; key is the longest choice ≤ 40%.

## JSON shape
```json
{
  "id": "rc-<slug>",
  "style": "critique_debate",
  "topic": "law",
  "comparative": false,
  "title": "Short descriptive title",
  "paragraphs": ["…", "…", "…"],
  "roleMap": { "paragraphs": ["context", "counterpoint", "main_point"], "viewpoints": [{ "who": "Traditional scholars", "position": "…", "authorAgrees": false }], "tone": "qualified approval" },
  "lowResSummary": "…",
  "questions": [ { "id": "rc-<slug>-q1", "type": "main_point", "logicTags": [], "difficulty": 2, "stem": "…", "choices": {…}, "answer": "C", "explanations": {…}, "trapPatterns": {…}, "keyTakeaway": "…", "evidence": [0, 2] } ]
}
```
One file per passage at `content/bank/rc/<slug>.json`. Comparative sets add `"paragraphsB": [...]`.

## QA gates (qa-rc.ts)
1. Zod schema. 2. Word counts in range. 3. Exactly one main_point per set; comparative sets include relationship. 4. Key-letter balance and key-length bias across the batch. 5. No duplicate titles/near-duplicate paragraphs. 6. Blind solver agreement ≥ 95% on questions.
