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
