# Apex LSAT — Implementation Plan
**Spec:** `/home/claude/specs/2026-10-24-lsat-program-spec.md` (approved 2026-10-26 with changes: responsive web, not mobile-first; batch verification; personal-first, cloud later)
**Date:** 2026-10-26
**Status:** Ready for approval

## Overview
Builds the personal LSAT study tool from the spec in five phases, each ending in one batched verification report rather than per-task check-ins. Phase 0–2 give Brian a usable daily study loop (lessons → adaptive drill → review → SRS) within three weeks; Phase 3–4 add RC, timed/PT simulation, timing intelligence, analytics and the AI tutor. Phase 5 (monetization) is out of scope.

## Decisions baked into this plan
| Decision | Choice | Why |
|---|---|---|
| Backend now | **PGlite** (Postgres-in-WASM, file-backed) via **Drizzle ORM (pg dialect)** | Zero infra today; it *is* Postgres, so moving to Supabase later is a connection-string change, not a rewrite. No auth in v1 (single user). |
| Backend later | Supabase Postgres + Auth, deployed on Vercel | Phone + computer access from anywhere. Flip when Brian wants cross-device sync (recommended at start of Phase 3). Until then: run locally; reachable from phone on home Wi-Fi via LAN URL. |
| Framework | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui | Responsive by default; Brian's existing stack. |
| Content format | Lessons in MDX; questions in JSON validated by Zod | Diffable, generatable, portable. |
| AI | **No API key in v1.** Question bank is generated + QA'd by Claude Code in-session (Brian's subscription); scripts kept in repo for reproducibility. Tutor shells out to the local `claude -p` CLI (subscription auth) while the app runs on Brian's machine. Cloud deploy (3.9) will require `ANTHROPIC_API_KEY` for the tutor only. | Brian's request: use subscription, not pay-per-use. |
| Repo | `brianyu18/apex-lsat` (private) | Brian creates the empty repo (this session's GitHub token can't create repos); I attach and push. Until then work is a local git repo at `/home/claude/apex-lsat`. |
| Verification cadence | One batched report per phase (checklist from dev-workflow §4) | Brian's request: minimal review turns. |

## File map (Phase 0–2; Phase 3–4 files listed under their tasks)
| File | Responsibility |
|---|---|
| `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` | Project config |
| `drizzle.config.ts`, `lib/db/client.ts` | PGlite connection + Drizzle instance (env-swappable to Supabase) |
| `lib/db/schema.ts` | All tables: questions, passages, attempts, sessions, misses, skills, plan, plan_days, lessons_progress, settings |
| `lib/db/migrate.ts` | Run migrations at startup |
| `lib/content/schema.ts` | Zod schemas: LRQuestion, RCPassage, Lesson frontmatter, taxonomy enums |
| `lib/content/taxonomy.ts` | 19 LR types + pairs + test frequencies; 13 logic tags; 5 RC styles; RC question types; trap patterns; difficulty rubric |
| `lib/content/load.ts` | Load/validate bank JSON + MDX lessons into DB |
| `lib/scoring/tables.ts` | Raw→scaled conversion (PT150–159 average curve), percentiles |
| `lib/scoring/range.ts` | Score range (last 5, shrinking MoE), BR gap |
| `lib/scoring/priorities.ts` | Priorities = (1−acc) × expected frequency |
| `lib/engine/rating.ts` | Elo-style skill rating per type/tag; question difficulty → opponent rating |
| `lib/engine/select.ts` | Next-question selection (auto / manual levels, random-difficulty %, interleave pair, exclusions, pool partition) |
| `lib/engine/guess.ts` | <10 s guess flag; confidence handling |
| `lib/engine/classify.ts` | Error-type pre-suggestion from timing/confidence/answer-change |
| `lib/engine/srs.ts` | Leitner 3/5/10 scheduler; similar-question pairing |
| `lib/engine/bottleneck.ts` | >30% of misses over 14 days → block |
| `lib/planner/generate.ts` | Date-agnostic phased plan generator |
| `lib/planner/replan.ts` | Re-plan on date change / accuracy signals |
| `app/layout.tsx`, `app/page.tsx` | Shell + dashboard |
| `app/onboarding/page.tsx` | Date, hours/week, diagnostic entry |
| `app/learn/[unit]/[lesson]/page.tsx` | Lesson renderer (MDX + interactive + 5-Q check) |
| `app/drill/page.tsx`, `app/drill/session/page.tsx` | Drill setup + drill loop |
| `app/review/page.tsx`, `app/review/[attemptId]/page.tsx` | Review Inbox + classifier/journal |
| `app/plan/page.tsx` | Calendar view of plan |
| `app/api/**` | Route handlers for attempts, sessions, plan, tutor |
| `components/drill/*` | QuestionCard, PredictionPanel, ConfidenceBar, Explanation, SessionSummary |
| `components/diagrams/ArgumentMap.tsx` | Interactive premise/conclusion builder |
| `components/diagrams/ConditionalChain.tsx` | Conditional-chain visualizer with live contrapositive |
| `components/diagrams/SetSandbox.tsx` | Quantifier / Venn sandbox |
| `components/diagrams/CausalModel.tsx` | Alt cause / reverse / coincidence diagram |
| `components/diagrams/TrapCatalog.tsx` | Interactive wrong-answer pattern catalog |
| `content/lessons/u0..u3/*.mdx` | Lessons |
| `content/bank/lr/*.json` | Original LR questions |
| `scripts/gen/generate-lr.ts` | Claude generation to spec |
| `scripts/gen/qa-lr.ts` | Automated QA + adversarial-solver pass |
| `scripts/gen/calibrate.ts` | Recalibrate difficulty from attempt data |
| `tests/engine/*.test.ts`, `tests/scoring/*.test.ts`, `tests/planner/*.test.ts` | Vitest |
| `tests/e2e/*.spec.ts` | Playwright |

---

## Phase 0 — Foundation (target: day 1–2)

### Task 0.1 — Scaffold
**What:** Next.js 15 + TS + Tailwind + shadcn/ui project, Vitest, Playwright, ESLint/Prettier, git init.
**File(s):** project root
**Implementation:** `pnpm create next-app`; add shadcn (button, card, dialog, tabs, slider, badge, progress, sheet); `pnpm add drizzle-orm @electric-sql/pglite zod @anthropic-ai/sdk next-mdx-remote`; dev deps vitest, @playwright/test, drizzle-kit.
**Verify:** `pnpm build` and `pnpm test` exit 0; `git log` shows initial commit.

### Task 0.2 — Database schema
**What:** Drizzle pg schema for all 10 tables in spec §3.
**File(s):** `lib/db/schema.ts`, `lib/db/client.ts`, `lib/db/migrate.ts`, `drizzle.config.ts`
**Implementation:** `questions.source` enum `original|official_ref`; stimulus/choices/explanations nullable; `attempts.confidence` enum; `misses.error_type` enum; indexes on (question_id), (session_id), (next_due). Client reads `DATABASE_URL`; if unset, uses PGlite at `./data/apex.db`.
**Verify:** `pnpm drizzle-kit generate` produces migration; `pnpm tsx lib/db/migrate.ts` creates tables; a smoke script inserts and reads one row.

### Task 0.3 — Taxonomy + content schemas
**What:** Single source of truth for LR types (with pairs + per-section frequency), logic tags, RC styles, RC question types, trap patterns, difficulty rubric; Zod schemas for bank items and lesson frontmatter.
**File(s):** `lib/content/taxonomy.ts`, `lib/content/schema.ts`
**Implementation:** Frequencies from research (Flaw 3.85 … Point of Agreement 0.10 per 25-Q section). Pairs: Weaken/Flaw; Strengthen/MSS/MBT; NA/SA; Explain/PAI; MainConclusion/Evaluate; Method/Parallel; plus ArgumentPart, PSA, Principle, FillInBlank, MBF, PointOfAgreement singles. Trap patterns: out-of-scope, wrong-force, reversal, premise-booster, half-right, opposite, extreme, shell-game, comparison-shift.
**Verify:** Unit test: frequencies sum ≈ 25 ± 0.5; every type belongs to exactly one pair group; Zod rejects a question with 4 choices or two keys.

### Task 0.4 — Scoring tables
**What:** Raw→scaled table (77-Q form averaged over PT150–159), percentile table, score-range with MoE.
**File(s):** `lib/scoring/tables.ts`, `lib/scoring/range.ts`
**Implementation:** 170≈−8, 173≈−5.5, 175≈−4.5, 177≈−3, 180≈−0.5 anchors interpolated; MoE = max(1, 4 − 0.6·(n−1)) for n ≤ 5 tests; range = mean ± MoE; BR gap = BR − timed.
**Verify:** Tests: raw 69/77 → 170±1; raw 73 → 175±1; one test → ±4, five tests → ±1.6.

### Task 0.5 — Planner v1
**What:** Generate a phased plan from (testDate | undecided, hoursPerWeek, diagnostic sections, startDate).
**File(s):** `lib/planner/generate.ts`, `lib/planner/replan.ts`
**Implementation:** Phases with default share of total weeks: Foundations 12% (min 1 wk), LR 30%, RC 18%, Mixed timed + weekly PT 32%, Final-week protect 8% (min 1 wk). Undecided → assume 24 weeks and label provisional. Diagnostic ≥ 165 → Foundations 5%. Daily blocks sized to hours/week across a days-per-week goal (default 6). `replan()` keeps completed days, regenerates the rest.
**Verify:** Tests for Jan 13 / Apr 8 / Jun 9 2027 and undecided from 2026-10-27: phases cover every day to test date, final week is protect, total hours ≈ weeks × hours/week ± 5%.

### Task 0.6 — Onboarding + plan page
**What:** Onboarding form (date or undecided, hours/week, days/week, diagnostic by section) → saves settings + plan; `/plan` calendar.
**File(s):** `app/onboarding/page.tsx`, `app/plan/page.tsx`, `app/api/plan/route.ts`
**Implementation:** Server actions write `settings`, `plan`, `plan_days`. Calendar = month grid with phase color + today's blocks; "Change test date" re-plans.
**Verify:** Playwright: complete onboarding with Apr 8 2027 → plan page shows 5 phases; change to Jun 9 → final-week block moves; completed days untouched.

**Phase 0 batch verification** → single report; then commit `phase-0`.

---

## Phase 1 — Study loop MVP (target: week 1–3)

### Task 1.1 — Content loader
**What:** Load + validate `content/bank/**/*.json` and `content/lessons/**/*.mdx` into DB (idempotent upsert by id).
**File(s):** `lib/content/load.ts`, `scripts/load-content.ts`
**Verify:** Run twice; row counts identical; invalid fixture file is rejected with a path + field error.

### Task 1.2 — Rating engine
**What:** Elo-style rating per (type|tag|rcStyle); difficulty 1–4 → opponent rating 1200/1450/1700/1950; K decays with n.
**File(s):** `lib/engine/rating.ts`
**Verify:** Simulation test: synthetic student with true ability "level 3" converges to 1700 ± 60 within 60 questions.

### Task 1.3 — Question selector
**What:** `nextQuestion(ctx)` implementing auto mode (at/below skill), manual levels, random-difficulty %, pair interleaving, exclusions (seen within 30 days unless Repeat on, above-skill in auto, reserved PT pool), source mixing (bank / official_ref / inbox / missed / skipped).
**File(s):** `lib/engine/select.ts`
**Verify:** Tests: 500 draws in auto never exceed skill level; random-difficulty 20% → 15–25% outside band; pair interleave alternates types within the pair; reserved pool never served.

### Task 1.4 — Guess + confidence
**What:** <10 s auto-guess flag (user can un-flag); confidence sure/leaning/guess stored; calibration = accuracy by confidence bucket.
**File(s):** `lib/engine/guess.ts`
**Verify:** Tests: 9 s → flagged, 10 s → not; calibration returns three buckets.

### Task 1.5 — Drill UI
**What:** Setup screen (section, levels or auto, pair/type, sources, prediction mode toggle, repeat toggle) → session loop: QuestionCard → (Prediction panel if on) → answer + confidence → Check → explanation merged under each choice → next; session summary table (level, type, time, confidence, flag). Responsive: single column ≤ 768 px, two-column (question | explanation) above.
**File(s):** `app/drill/page.tsx`, `app/drill/session/page.tsx`, `components/drill/*`, `app/api/attempts/route.ts`
**Verify:** Playwright at 390 px and 1280 px: 5-question session completes; attempts rows written with seconds and confidence; "You haven't reviewed the explanation" blocks Next until explanation opened on a miss.

### Task 1.6 — Review Inbox
**What:** Every miss and every guessed-right auto-enqueued; list with filters; mark done (7-day Recently Done); restore.
**File(s):** `app/review/page.tsx`, `app/api/review/route.ts`
**Verify:** Playwright: miss in drill appears in inbox; mark done → moves to Recently Done.

### Task 1.7 — Interactive diagram primitives (4)
**What:** ArgumentMap (drag sentences into premise / sub-conclusion / conclusion slots; checks), ConditionalChain (type `A → B`, chain, live contrapositive + validity check), SetSandbox (some/most/all toggles render overlap; test inferences), CausalModel (click alt-cause / reverse / coincidence / sample to show how each attacks a claim).
**File(s):** `components/diagrams/{ArgumentMap,ConditionalChain,SetSandbox,CausalModel}.tsx`
**Verify:** Storybook-free: a `/dev/diagrams` page renders all four; manual + Playwright smoke (each responds to one interaction and renders at 390 px).

### Task 1.8 — Lesson renderer + Unit 0–1 lessons
**What:** MDX renderer with `<Diagram name=… />` and `<Check tags=[…] />` components; author Unit 0 (3 lessons) and Unit 1 (18 lessons: arguments ×4, grammar/translation ×4, conditional ×4, quantifiers ×2, formal flaws ×2, causation ×2), each ≤ 600 words + diagram + 5-Q check drawn from bank by tag; pass ≥ 4/5 to complete.
**File(s):** `app/learn/[unit]/[lesson]/page.tsx`, `components/learn/*`, `content/lessons/u0/*.mdx`, `content/lessons/u1/*.mdx`
**Verify:** All lessons render; word count script ≤ 600; every `<Check>` resolves ≥ 5 bank questions; completing a check at 4/5 marks lesson done.

### Task 1.9 — Bank generation pipeline + bank v0 (150 LR)
**What:** `generate-lr.ts` prompts Claude with the spec (type, tags, difficulty, trap plan for each wrong answer, explanation per choice); `qa-lr.ts` runs structural QA then an adversarial-solver pass (independent Claude call must pick the same key, else reject); writes to `content/bank/lr/`. Generate 150 LR items distributed by test frequency and 25/35/25/15 difficulty.
**File(s):** `scripts/gen/generate-lr.ts`, `scripts/gen/qa-lr.ts`, `scripts/gen/prompts/*.md`, `content/bank/lr/*.json`
**Verify:** ≥ 95% solver agreement on retained items; Zod passes all; type distribution within ±2 of target; Brian spot-reads 10 at random during the Phase 1 report.

### Task 1.10 — Dashboard v1
**What:** Home: today's plan blocks, Drill / Review / Learn buttons, streak (days/week goal), inbox count, skill ratings per section.
**File(s):** `app/page.tsx`, `components/dashboard/*`
**Verify:** Playwright: after onboarding + one drill session, dashboard shows streak 1, inbox > 0, ratings populated.

**Phase 1 batch verification** → report; commit `phase-1`. **Brian starts studying here.**

---

## Phase 2 — Full LR + review system (week 3–6)

### Task 2.1 — Units 2–3 lessons
**What:** 19 LR type lessons (in pairs, frequency order) + 13 logic-tag lessons, each with TrapCatalog diagram or type-specific attack map and 5-Q check.
**File(s):** `content/lessons/u2/*.mdx`, `content/lessons/u3/*.mdx`, `components/diagrams/TrapCatalog.tsx`, `components/diagrams/AttackMap.tsx`
**Verify:** Same lesson checks as 1.8; every LR type and tag has a lesson.

### Task 2.2 — Timed section mode + Blind Review
**What:** Section runner (35/53/70/custom min) for bank sections (25 Q assembled by frequency); flag during timed; on submit flagged + blank reopen untimed; store timed and BR answers; show both scores + gap.
**File(s):** `app/test/section/page.tsx`, `components/test/*`, `lib/scoring/br.ts`, `app/api/sessions/route.ts`
**Verify:** Playwright: run a section, flag 3, submit, BR changes 1 → gap = 1 displayed; sessions row has both scores.

### Task 2.3 — Error classifier + journal
**What:** On every miss / guessed-right: one-tap error type with pre-suggestion (rule-based: changed-from-correct → careless/time; <10 s → guess; >150 s → time pressure; trap pattern of chosen answer → trap/subtype; else logic gap / misread choice); journal fields (why chose, why rejected, how predict, killing words, avoid next time) stored in `misses`.
**File(s):** `lib/engine/classify.ts`, `app/review/[attemptId]/page.tsx`
**Verify:** Seeded test set of 50 attempts with ground-truth labels → pre-suggestion ≥ 70% match; journal persists.

### Task 2.4 — SRS scheduler
**What:** Leitner boxes 1→3 days, 2→5, 3→10, then graduate; correct advances, miss resets; pairs each due item with a similar bank question (same type + ≥1 shared tag + same level).
**File(s):** `lib/engine/srs.ts`, drill source "Due today"
**Verify:** Tests: date arithmetic for each box; pairing returns a different question meeting criteria; dashboard shows due count.

### Task 2.5 — Bottleneck detection
**What:** Nightly (on load) compute share of misses by type/tag over 14 days; >30% and n ≥ 8 → create a "focus block" (untimed drill of that type until rolling accuracy > 85% over last 20).
**File(s):** `lib/engine/bottleneck.ts`, dashboard card
**Verify:** Test: seeded misses 40% Flaw → block created; after 20 attempts at 90% → cleared.

### Task 2.6 — Bank → 400 LR
**What:** Run pipeline for +250 items; recalibrate difficulty from Brian's attempt data (`calibrate.ts`: if ≥ 20 attempts, observed accuracy vs level band → adjust ±1).
**File(s):** `scripts/gen/calibrate.ts`, `content/bank/lr/*.json`
**Verify:** 400 items pass QA; calibration report lists adjusted items.

**Phase 2 batch verification** → report; commit `phase-2`.

---

## Phase 3 — RC, timing, PT simulator (week 6–8)
*Recommended switch point to Supabase + Vercel for phone access — one task, listed last.*

### Task 3.1 — RC schema + PassageMap diagram
**What:** Passage model (paragraphs, role map, viewpoints, tone markers); PassageMap builder (drag paragraph → role label; mark viewpoints; write low-res summary ≤ 8 words; compare to key).
**File(s):** `lib/content/schema.ts` (extend), `components/diagrams/PassageMap.tsx`
**Verify:** Diagram renders a fixture passage; summary length enforced.

### Task 3.2 — Unit 4 RC lessons
**What:** 12 lessons: method ×2, 5 passage styles ×1 each, question types ×2, comparative ×2, highlighting ×1.
**File(s):** `content/lessons/u4/*.mdx`
**Verify:** Lesson checks as before; each style lesson embeds a PassageMap walk-through.

### Task 3.3 — RC generation pipeline + 48 passages
**What:** `generate-rc.ts` + `qa-rc.ts` (passage 400–500 words, 4 topics × 12, 5–8 Qs each by RC type frequency, 12 comparative); same adversarial QA.
**File(s):** `scripts/gen/generate-rc.ts`, `scripts/gen/qa-rc.ts`, `content/bank/rc/*.json`
**Verify:** 48 passages / ~300 Qs pass; topic and type distributions within tolerance.

### Task 3.4 — RC drill + RC timed section
**What:** Passage-first drill (Prediction Mode asks main point before questions), time split passage vs questions, RC section mode (4 passages, 35 min).
**File(s):** `app/drill/*` (extend), `app/test/section/*` (extend)
**Verify:** Playwright RC drill records passage-time and question-time separately; ≥ 40% passage-time rule surfaces in summary.

### Task 3.5 — Timing heatmap + checkpoints
**What:** Per-section cumulative-time curve vs checkpoints (Q10 9 min, Q15 15, Q20 24, Q25 33 for LR; passage ends 8.5/17/25.5/34 for RC); per-type time-on-right vs time-on-wrong.
**File(s):** `lib/engine/pacing.ts`, `components/analytics/TimingHeatmap.tsx`
**Verify:** Fixture section renders curve; checkpoint misses highlighted.

### Task 3.6 — Skip-decision trainer
**What:** Section variant where each question first asks "attempt / skip"; policy by goal (170: 3–4 skips; 175+: ≤ 2); scores decisions (skipped a Q you'd have gotten fast = cost; sat 150 s+ on a miss = cost); return pass.
**File(s):** `app/test/skip-trainer/page.tsx`, `lib/engine/skipPolicy.ts`
**Verify:** Tests on seeded section: policy scoring matches expected costs; UI runs end-to-end.

### Task 3.7 — Full PT simulator (LawHub June-2026 UI)
**What:** 4 sections (2 LR + RC + experimental LR/RC random) + 10-min break; UI parity: highlight/underline across stimulus/stem/choices, flag, question navigator bar, no single-click eliminate, timer hideable except last 5 min, "Reset response"; desktop and tablet layouts; BR after.
**File(s):** `app/test/pt/page.tsx`, `components/test/LawHubShell.tsx`
**Verify:** Playwright full run at 1280 px and 820 px; scaled score + BR shown; sessions row kind=pt.

### Task 3.8 — LawHub import (official PTs)
**What:** Manual/CSV entry of an official PT (PT number, per-section answers right/wrong + optional seconds); creates `official_ref` questions by (pt, section, number) and attempts; counts toward score range.
**File(s):** `app/test/import/page.tsx`, `lib/import/lawhub.ts`
**Verify:** Import fixture CSV → 77 attempts; score range updates; no stimulus text stored (assert nulls).

### Task 3.9 — Cloud switch (optional, recommended here)
**What:** Supabase project + Vercel deploy; `DATABASE_URL` → Supabase; Supabase Auth with single allowed email; export/import PGlite data.
**File(s):** `supabase/migrations/*`, `lib/db/client.ts`, `middleware.ts`
**Verify:** Deployed URL works on phone and laptop; data migrated; unauthenticated request redirected.

**Phase 3 batch verification** → report; commit `phase-3`.

#### Phase 3 — as built (2026-10-28)
| Task | Status | Where |
|---|---|---|
| 3.1 RC schema + PassageMap | ✅ | `lib/content/schema.ts` (RCPassageSchema, roleMap/viewpoints/lowResSummary ≤160), `components/diagrams/passage-map.tsx` |
| 3.2 Unit 4 lessons | ✅ 12 lessons, 65 total | `content/lessons/u4/*.mdx` |
| 3.3 RC bank | ✅ 48 sets / 313 Qs, 10 comparative, topics 12×4, styles per spec; blind solvers 313/313 | `content/bank/rc/*.json`, `scripts/gen/qa-rc.ts`, `scripts/gen/prompts/rc-spec.md` (generate-rc.ts deferred: bank authored in-session, same as LR) |
| 3.4 RC drill + RC section | ✅ | `app/drill/rc`, `components/drill/{rc-session,passage-panel}.tsx`, `lib/data/rc.ts` (assembleRcSection), `/test/section?kind=RC` |
| 3.5 Timing heatmap | ✅ | `components/test/timing-heatmap.tsx`, `/test/timing`, `timingGrid()` in `lib/data/sections.ts` (per-question vs `lrTargetCumulative`, thirds summary, slowest types) |
| 3.6 Skip trainer | ✅ | `lib/engine/skip-policy.ts`, `components/test/skip-trainer.tsx`, `/test/skip-trainer` (10 s gate, return pass, decision score) |
| 3.7 PT simulator | ✅ | `lib/data/pt.ts`, `components/test/{lawhub-section,pt-runner}.tsx`, `/test/pt` (random experimental, 10-min break, single BR, scaled) |
| 3.8 LawHub import | ✅ | `lib/import/lawhub.ts` (grid + CSV), `lib/data/import.ts`, `/test/import` |
| 3.9 Cloud switch | ⏸ deferred until Brian asks (DATABASE_URL swap already supported) | — |

---

## Phase 4 — Analytics + AI tutor (week 8–10)

### Task 4.1 — Priorities + trends
**What:** Priorities table ((1−acc) × frequency, by type/tag, with n); trend charts: score range over time, BR gap, accuracy by level, calibration curve.
**File(s):** `lib/scoring/priorities.ts`, `app/analytics/page.tsx`, `components/analytics/*`
**Verify:** Tests on fixtures; page loads < 1 s with 5,000 attempts.

### Task 4.2 — Study Quality score
**What:** Accuracy 28 / consistency 27 / review 26 / duration 10 / variety 9 over trailing 30 days.
**File(s):** `lib/scoring/quality.ts`, dashboard card
**Verify:** Tests for each component; perfect month → 100.

### Task 4.3 — Planner v2 (data-driven re-plan)
**What:** Extend a phase when its exit criteria aren't met (Foundations: checks ≥ 4/5; LR: type ratings ≥ level-3 band; RC same); propose registration when range ≥ goal.
**File(s):** `lib/planner/replan.ts` (extend)
**Verify:** Tests: unmet LR criteria at phase end → LR extended 1 wk, later phases compressed, final week preserved.

### Task 4.4 — AI tutor
**What:** Chat panel on any question (bank: full content; official_ref: Brian pastes gist) grounded with tags, his answer/confidence/time, error history, relevant lesson excerpt; Socratic system prompt (never leads with the answer, ≤ 250 words, cites lesson, states uncertainty); streaming.
**File(s):** `lib/tutor/prompt.ts`, `app/api/tutor/route.ts`, `components/tutor/TutorPanel.tsx`
**Verify:** 20 seeded bank questions → tutor's eventual key = answer key 100%; response length check; no answer in first message.

### Task 4.5 — Units 5–6 lessons
**What:** Timing & test craft ×5 (pacing, skipping, confidence calibration, Ugly-mode realism, final-week protocol) with PacingSimulator diagram; Argumentative Writing ×3 with OutlineBuilder + timed practice (15 + 35 min).
**File(s):** `content/lessons/u5/*.mdx`, `content/lessons/u6/*.mdx`, `components/diagrams/PacingSimulator.tsx`, `components/writing/OutlineBuilder.tsx`
**Verify:** Lessons render; writing practice saves essay + timings.

### Task 4.6 — PWA + offline drill cache
**What:** Manifest, service worker caching lessons + 100 queued bank questions; attempts queued offline and synced.
**File(s):** `app/manifest.ts`, `public/sw.js`, `lib/offline/queue.ts`
**Verify:** Playwright offline mode: drill 5 questions, go online → attempts synced.

**Phase 4 batch verification** → report; commit `phase-4`. **Product complete for personal use.**

#### Phase 4 — as built (2026-10-28)
| Task | Status | Where |
|---|---|---|
| 4.1 Priorities + trends | ✅ | `lib/scoring/priorities.ts`, `lib/data/analytics.ts`, `components/analytics/charts.tsx`, `/analytics` (score trend w/ range band, BR gap, accuracy by level, calibration, time right/wrong) — chart pair validated with the dataviz palette checker |
| 4.2 Study Quality | ✅ | `lib/scoring/quality.ts` (28/27/26/10/9), ring on `/analytics` and the dashboard |
| 4.3 Planner v2 | ✅ | `generatePlan.extraDays`, `replan()` with `decideExtension`, `phaseSignals()`, `registrationAdvice()`, readiness cards on `/plan`; migration 0001 (`plan.extra_days`, `plan.start_date`) |
| 4.4 AI tutor | ✅ | `lib/tutor/{prompt,context,provider}.ts`, `/api/tutor` (streams; local `claude -p` or API key), `components/tutor/tutor-panel.tsx` on drill + review; `scripts/tutor-check.ts` 20/20 |
| 4.5 Units 5–6 | ✅ 8 lessons (73 total) | `content/lessons/u5/*` (checkMode timed → 10-Q/14-min section), `u6/*` (checkMode writing), `components/diagrams/pacing-simulator.tsx`, `components/writing/{outline-builder,writing-runner}.tsx`, `/test/writing`, `lib/writing/prompts.ts` |
| 4.6 PWA + offline | ✅ | `app/manifest.ts`, `public/sw.js`, `components/shell/pwa.tsx`, `lib/offline/queue.ts` (IndexedDB pack + attempt queue), `/api/offline/{pack,sync}`, drill-session fallback |
| extra | demo seed | `lib/dev/seed.ts`, `/api/dev/seed`, `scripts/seed-demo.ts` |

---

## Known risks
- **Bank quality** is the single biggest risk; mitigated by adversarial-solver QA, Brian's spot reads, and difficulty recalibration from real attempt data. If agreement rate falls below 95% the generation prompt is revised before scaling past 150.
- **Planner realism** depends on diagnostic accuracy; re-planning (4.3) corrects over time.
- **GitHub push** blocked until Brian creates the empty private repo; local git history is preserved and pushed in full afterward.
- **Phone access before 3.9** is LAN-only.

## Out of scope
Billing, multi-user auth tiers, LSAC coaching license / LawHub tether, live classes, tutoring, community, video content, Logic Games, redistribution of any official question text.
