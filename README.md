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

### AI tutor
The tutor (on every drill explanation and review page) runs through the local **`claude` CLI** using your subscription login — no API key. Install Claude Code, run `claude` once to sign in, and the tutor works. For a cloud deploy set `ANTHROPIC_API_KEY` and it switches to the Messages API. `APEX_TUTOR_MODEL` (CLI alias, default `sonnet`) / `APEX_TUTOR_API_MODEL` override the model.

### Phone / offline
The app is installable (PWA). Open **Drill** once while online to cache a 100-question pack; drilling offline grades locally and queues attempts, which sync (with a toast) the next time the app is online. The service worker is registered in production builds (`pnpm build && pnpm start`).

## Scripts

- `pnpm test` — unit tests (Vitest)
- `pnpm test:e2e` — Playwright (desktop + phone)
- `pnpm typecheck`, `pnpm lint`
- `pnpm tsx scripts/check-lessons.ts` — lesson frontmatter + word counts
- `pnpm tsx scripts/mdx-check.ts` — every lesson compiles
- `pnpm tsx scripts/gen/qa-lr.ts [--solve]` — LR bank QA (schema, key balance, duplicates, blind-solver agreement)
- `pnpm tsx scripts/gen/qa-rc.ts [--solve]` — RC bank QA (passage length, role map, question-type mix, same solver protocol)
- `pnpm tsx scripts/ingest-509.ts <aba-509.xlsx> --year=2025` — build `content/schools/schools.json` from the ABA Standard 509 compilation (the Schools page is empty until this runs)
- `pnpm tsx scripts/tutor-check.ts [--n=20]` — tutor acceptance: no answer on the first turn, ≤ 250 words, key agreement when asked outright
- `pnpm tsx scripts/seed-demo.ts [--weeks=6]` — fill the DB with a deterministic six-week study history (demo / screenshots; never touches settings or plan)
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
| `/test/writing` | Argumentative Writing: 15-min prewrite (outline builder) + 35-min essay, saved for rereading |
| `/test/official` | Official PrepTest track: list the LawHub tests you can access; the app assigns one per PT day (newest saved for the final weeks), links to LawHub and the import, keeps the tally. Official misses get a one-line gist on their review page (your words — never LSAC text) that the tutor uses |
| `/schools` | Where you stand: every ABA school's LSAT/GPA 25/50/75 vs. your range and GPA, an admission estimate (likely / target / reach / long shot), the LSAT needed to move a band, and a target list that feeds the plan's registration goal |

## Analytics and planning

- `/analytics` — score range (last 5 full tests, shrinking margin), blind-review gap, **Priorities** = (1 − accuracy) × expected questions per test, accuracy by level, calibration curve (sure / leaning / guess vs. target bands), time on right vs. wrong by type, and **Study Quality** (accuracy 28 / consistency 27 / review 26 / time 10 / variety 9 over 30 days).
- `/plan` — **official LSAT dates** (from LSAC; registration deadline and score release per administration) with a pace model: hours/week needed from your estimate to your goal in the weeks available (relaxed / standard / aggressive / unrealistic), one-click switch to another administration (re-plans, keeps completed days) or apply the recommended hours; phase exit criteria (foundations ≥ 80% of U1 checks; LR ≥ 75% of types at level 3+; RC rating at level 3+) and registration advice (register when the range floor is within 2 of the goal). Re-planning extends an uncleared phase by a week; later phases absorb it when the date is fixed.
