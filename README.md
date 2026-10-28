# Apex LSAT

A personal LSAT study system: visual lessons, adaptive drilling, blind review, error taxonomy, spaced re-drill, timing intelligence, and a grounded tutor.

- Spec: see `docs/spec.md`
- Plan: see `docs/plan.md`

## Run

```bash
pnpm install
pnpm db:migrate
pnpm content:load
pnpm dev
```

Data lives in a local PGlite database at `./data/apex` by default. Set `DATABASE_URL` to use Postgres (e.g. Supabase) instead.

## Scripts

- `pnpm test` — unit tests (Vitest)
- `pnpm test:e2e` — Playwright (desktop + phone)
- `pnpm typecheck`, `pnpm lint`
- `pnpm tsx scripts/check-lessons.ts` — lesson frontmatter + word counts
- `pnpm tsx scripts/mdx-check.ts` — every lesson compiles
- `pnpm tsx scripts/gen/qa-lr.ts [--solve]` — LR bank QA (schema, key balance, duplicates, blind-solver agreement)
- `pnpm tsx scripts/gen/qa-rc.ts [--solve]` — RC bank QA (passage length, role map, question-type mix, same solver protocol)
- `pnpm tsx scripts/gen/calibrate.ts [--apply]` — re-level questions from your attempt data (needs ≥20 counted attempts per item)
- `pnpm tsx scripts/gen/generate-lr.ts --type=flaw --difficulty=3 --n=5` — generate more items via the local `claude` CLI, then QA them

## Content

- `content/lessons/u0–u6/*.mdx` — lessons (see `content/lessons/AUTHORING.md`)
- `content/bank/lr/*.json` — original LR questions (spec: `scripts/gen/prompts/lr-spec.md`)
- `content/bank/rc/*.json` — original RC passage sets (spec: `scripts/gen/prompts/rc-spec.md`)
- Official LSAT questions are never stored; LawHub results are imported by reference only (`/test/import`).

## Test modes

| Route | What it is |
|---|---|
| `/test/section` | Timed LR section (25 Q / 35 min) in a LawHub-style interface, then blind review of flagged + blank |
| `/test/section?kind=RC` | Timed RC section: 4 passages (one comparative when available), passage pane with A/B switch |
| `/test/pt` | Full practice test: 4 sections, random experimental, 10-minute break after section 2, one blind review at the end |
| `/test/skip-trainer` | LR section with a 10-second attempt/skip gate per question; scores the decisions against your goal's skip policy |
| `/test/timing` | Timing heatmap: seconds per question vs pacing target across your last 12 sections |
| `/test/import` | Paste LawHub results (grid or CSV); creates `official_ref` rows, counts toward score range and inbox |
