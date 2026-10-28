# Lesson authoring guide (Units 2–3)

Each lesson is an `.mdx` file with YAML frontmatter and ≤ 600 words of body (tags excluded).

## Frontmatter (all keys required unless noted)
```yaml
---
id: u2/flaw            # must equal "<unit-folder>/<file-stem>"
unit: 2
order: 1               # unique within unit; teaching order
title: "Flaw"          # quoted
summary: "One sentence, quoted."
checkTags: [flaw]      # LR type ids (for U2) or logic tag ids (for U3); the 5-Q check draws from these
diagram: AttackMap     # optional, informational
minutes: 9
---
```

## Available components
- `<AttackMap type="Flaw" stem="…canonical stem…" steps={[{label, do, example}, …]} />` — 4–5 steps: Read → Find the gap → Prephrase → Judge choices (→ Confirm). `example` is the worked example's state at that step (use `\n` for line breaks).
- `<TrapCatalog title="…" traps={[{pattern, setup, tempting, killer, instead}, …]} />` — 3–5 traps; `pattern` must be one of the trap ids in lib/content/taxonomy.ts (out_of_scope, wrong_force, reversal, premise_booster, half_right, opposite, extreme, shell_game, comparison_shift, wrong_part, true_but_irrelevant, necessary_v_sufficient).
- `<TagSpotter tag="Sampling" items={[{text, present, tell, why}, …]} />` — 5–6 short stimuli; `tell` is an exact substring of `text` to highlight.
- `<ArgumentMap sentences={[{text, role, why}]} />` (roles: context | premise | sub_conclusion | conclusion), `<ConditionalChain initial={[…]} quiz={[…]} />`, `<SetSandbox />`, `<CausalModel x y z />` — from Unit 1.
- Blocks: `<KeyIdea>…</KeyIdea>`, `<Callout tone="info|warn|ok|accent" title="…">…</Callout>`, `<Example label="…">…</Example>`, `<Steps>1. … 2. …</Steps>` (numbered markdown list inside).

## Voice and shape
Direct, second person, no fluff, no "in this lesson we will". Lead with the stem and the task. Short sections with `##` headings. One `<KeyIdea>` per lesson. Tables welcome. All stimuli/examples original (no real living people, no copyrighted LSAT text). Quote stems exactly as LSAC phrases them (see scripts/gen/prompts/lr-spec.md).

## Unit 2 lesson shape (one per LR type)
1. The stem(s) and what the task really asks (1 short paragraph)
2. The read for this type: what to find, what to prephrase — with `<AttackMap>`
3. What the right answer looks like (force, scope, form) — 3–5 bullets
4. The wrong answers for this type — `<TrapCatalog>` with 3–5 traps
5. Level-4 variant: how the hard version of this type differs (abstract phrasing, structure)
6. `<KeyIdea>` + a 2–3 line "before you read the choices" checklist

## Unit 3 lesson shape (one per logic tag)
1. The pattern in one sentence, and which types it shows up in
2. How to recognize it — tell-tale words/structures; `<TagSpotter>` with 5–6 items
3. How it's exploited: as a flaw, as a weakener/strengthener, as an assumption, in MSS/MBT (whichever apply) — short table
4. Level-4 variant
5. `<KeyIdea>`

## Unit 4 (RC) additions
- `<PassageMap passage={{ title, paragraphs: [...], roles: [...], viewpoints: [{who, position, authorAgrees}], tone, lowResSummary }} />` — interactive: the student drags/taps each paragraph to a role, marks viewpoints, writes a ≤ 8-word summary, then compares to the key. Keep passages in lessons to 3–4 short paragraphs (≈60–90 words each) so the lesson stays readable; full-length passages live in the bank.
- `checkSection: RC` and `checkTags` = RC question type ids (stated, main_point, author_perspective, purpose_in_context, meaning_in_context, other_perspective, purpose_of_passage, weaken_strengthen_evaluate, analogy, application, author_attitude, principle, purpose_of_paragraph, organization, relationship, approach) or RC style ids (critique_debate, single_position, phenomenon_hypothesis, problem_analysis, spotlight).

## Units 5–6 additions
- `checkMode: timed` (Unit 5) — the lesson check is a 10-question timed LR set (14 min) in the LawHub interface; pass at 7/10. `checkTags` still required (use a representative mix, e.g. `[flaw, necessary_assumption, must_be_true]`); `checkSection: LR`.
- `checkMode: writing` (Unit 6) — the check is a full timed essay at `/test/writing`; saving an essay ≥150 words completes the lesson. Use `checkTags: [writing]`.
- `<PacingSimulator />` — interactive 25-question cumulative-time curve with sliders for easy/medium/hard seconds, first-pass skips, and a one-question time bleed; checkpoints Q10 9:00 / Q15 15:00 / Q20 24:00 / Q25 33:00. Optional props `n`, `totalSec`.
- `<OutlineBuilder prompt={{ title, context, issue, perspectives: [{label:"A", text}, …] }} />` — the 15-minute prewriting scaffold (position → thesis → two reasons with support → best objection with concession and rebuttal) with a live 7-point outline check. Prompts in lessons must be original; keep 3–4 perspectives of 1–2 sentences each.
- Unit 5 lesson shape: the rule in one line → why it works (data from the timing heatmap / skip trainer the student has) → the diagram or a table → a concrete protocol (numbered `<Steps>`) → `<KeyIdea>`. Reference the app's own tools by route name (`/test/timing`, `/test/skip-trainer`, `/test/section`, `/test/pt`).
- Unit 6 lesson shape: what the task is (format, two clocks, unscored but read) → what strong essays do (thesis as claim, two reasons with support, one objection engaged) → `<OutlineBuilder>` sandbox → a short annotated model paragraph in `<Example>` → `<KeyIdea>`.
