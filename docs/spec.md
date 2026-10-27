# Apex LSAT — Product Spec v1
*Date: 2026-10-24 · Status: DRAFT for Brian's sign-off · Follows: competitive analysis in the Law Degree project*

Working name "Apex LSAT" — placeholder, rename anytime.

---

## 1. Goal

A self-hosted, mobile-first LSAT study program that takes Brian from an untested baseline to a top-tier score (target band 173–178) on his first official attempt, and that is architected so it can later be sold as a product rivaling 7Sage and LSAT Demon.

### Success criteria (measurable)
| # | Criterion | Target |
|---|---|---|
| S1 | Blind-review PT score (last 5 tests) | ≥ 175 before registering |
| S2 | Timed PT score range (last 5 tests, shrinking MoE) | ≥ 173 before registering |
| S3 | Timed–BR gap | ≤ 3 points in final 4 weeks |
| S4 | Hardest-tier accuracy (level 4: abstract Flaw, Parallel, SA, science/comparative RC) | ≥ 85% untimed, ≥ 75% timed |
| S5 | Pacing | Hits section checkpoints (Q10 ≈ 9 min, Q15 ≈ 15, Q20 ≈ 24, Q25 ≈ 33) on 4 of last 5 timed LR sections |
| S6 | Study consistency | ≥ 6 study days/week over the plan |
| S7 | Product completeness | Every feature in §4 passes its acceptance criteria |

### Non-goals (v1)
- No billing, multi-tenant auth tiers, or LSAC licensing integration (Phase 5, later).
- No live classes, tutoring marketplace, or community features.
- No talking-head video content.
- No redistribution of official LSAT questions in any form.

---

## 2. Constraints

| Constraint | Consequence |
|---|---|
| Official LSAT questions are LSAC-licensed; displaying them requires LawHub Advantage + a $38/student coaching license | Official questions are never stored. Brian does them in LawHub; the app stores only references (PT, section, Q#), his answers, timing, tags, and his own notes/explanations. |
| Test format fixed through 2027: 2 LR + 1 RC scored + 1 unscored, 35 min each | All timing, scoring, and PT simulation target this format. |
| In-person delivery via new LawHub UI (June 2026) | Full-PT simulator replicates that UI for original tests. |
| Target date unknown; must flex | Planner is date-agnostic: input any test date + hours/week; re-plans on change. |
| No diagnostic yet | Onboarding starts with LawHub free PT 158 under timed conditions; score entered manually. |
| Brian is a visual learner, mostly on phone | Every lesson has an interactive diagram; mobile-first PWA; no feature requires desktop. |

---

## 3. Architecture

**Stack:** Next.js 15 (App Router) + TypeScript · Tailwind · Supabase (Postgres, Auth, RLS, Storage) · Claude API (tutor, content generation) · PWA (offline drill cache) · Vitest + Playwright · GitHub repo built via Claude Code.

**Repo layout (one responsibility per directory):**
```
apex-lsat/
  app/            routes: (onboarding) (learn) (drill) (test) (review) (analytics) (plan) (tutor)
  components/     UI + interactive diagram primitives (argument-map, conditional-chain, passage-map…)
  lib/
    engine/       skill rating, question selection, SRS scheduler, error classifier, pacing analytics
    scoring/      raw→scaled tables, score range, BR gap, priorities
    planner/      date-agnostic schedule generator
    tutor/        Claude prompts + grounding
    content/      question/lesson schema + validators
  content/
    lessons/      MDX lessons (units 0–6)
    bank/         original questions (JSON, tagged)
  supabase/       migrations, RLS policies, seed
  scripts/        content generation + QA pipeline
  tests/
```

**Core data model (Postgres):**
- `questions` (id, source: original|official_ref, pt, section, number, type, logic_tags[], difficulty 1–4, trap_patterns[], stimulus/choices/explanations — NULL for official_ref)
- `passages` (id, style, topic, paragraphs[], role_map)
- `attempts` (id, question_id, mode: drill|timed|pt|br, answer, correct, seconds, confidence: sure|leaning|guess, guess_flag, changed_from, br_answer, session_id)
- `sessions` (id, kind, pt_ref, timed, duration, score_raw, score_scaled, br_score)
- `misses` (attempt_id, error_type: misread|logic_gap|trap|time_pressure|careless|guessed_right, trap_subtype, journal fields, srs_box, next_due)
- `skills` (user, dimension: type|tag|rc_style, rating, n, last_updated)
- `plan` (test_date, hours_per_week, phases[], generated_at), `plan_days` (date, blocks[])
- `lessons_progress` (lesson_id, status, check_score)

---

## 4. Modules and acceptance criteria

### 4.1 Onboarding & diagnostic
- Enter target date (or "undecided") + hours/week; record diagnostic (PT 158 from LawHub) by section scores.
- **Accept:** plan generated within one screen of entering the diagnostic; changing the date regenerates the plan without losing progress.

### 4.2 Curriculum (visual-first)
Units: 0 Diagnostic & Plan · 1 Foundations (arguments, grammar/translation, conditional logic, quantifiers, formal flaws, causation) · 2 LR by type (19 types in Demon's pairs, ordered by test frequency) · 3 Logic tags (13 cross-type) · 4 RC (5 passage styles, low-res summary, viewpoint/tone tracking, role-labeled paragraph maps, question types, comparative) · 5 Timing & test craft · 6 Argumentative Writing.
- Each lesson = ≤ 600 words + one interactive diagram + 5-question adaptive check (pass ≥ 4/5 to mark complete, mastery-style).
- Interactive primitives (v1): argument-structure builder, conditional-chain visualizer (live contrapositive), quantifier/set sandbox, causal-model diagram, trap-answer catalog, passage-map builder, pacing simulator, skip-decision trainer.
- **Accept:** all units authored; every lesson renders on a 390px screen; every check is drawn from the bank by tag.

### 4.3 Adaptive drill engine
- Per-type and per-tag ratings (Elo-style, question difficulty as opponent rating).
- Selection: at/below skill by default ("auto"), random-difficulty slider, interleaving across the active pair, excludes above-skill questions, warns after 7 days of unchanged filters.
- Prediction Mode: hide stem + choices → user writes prediction → reveal → compare.
- Every answer carries a confidence tag (sure / leaning / guess); < 10 s auto-flags guess.
- Sources: original bank, official references (manual/CSV import from LawHub), Review Inbox, Missed, Skipped.
- Test-pool partitioning: official PTs reserved for timed use are excluded from drilling.
- **Accept:** 200-question simulation shows rating converging; no above-skill question served in auto mode; guess flag fires correctly.

### 4.4 Timed sections & PT simulator
- Section mode (35 / 53 / 70 / custom min) and full PT (4 sections + break) for original tests; replicates June-2026 LawHub UI (highlight/underline everywhere, flag, question bar, no single-click eliminate, timer-hide rules).
- Blind Review built in: flagged questions reopen untimed after submit; records BR answers; shows timed score, BR score, and gap.
- Official PTs: done in LawHub; results imported (CSV or manual) with per-question time where available.
- **Accept:** a full PT runs end-to-end on phone; both scores computed; import of a LawHub result populates attempts.

### 4.5 Review system
- Every miss (and every guessed-right) opens a one-tap error classifier: misread / logic gap / trap (sub-typed: scope, force, reversal, premise-booster, half-right…) / time pressure / careless. System pre-suggests from timing + confidence + answer-change data.
- Journal fields (Demon's checklist) stored as data.
- SRS: Leitner boxes 3 / 5 / 10 days; re-drill pairs the item with a structurally similar bank question.
- Bottleneck alert: any type/tag > 30% of misses over 14 days → untimed block until > 85%.
- **Accept:** classifier pre-suggestion matches manual tag ≥ 70% on a seeded test set; due items surface on the dashboard daily.

### 4.6 Timing intelligence
- Time-bleed heatmap per section vs checkpoints; per-type time-on-wrong vs time-on-right.
- Skip-decision trainer: scores skip/return decisions against a goal-dependent policy (170 → 3–4 skips; 175+ → ≤ 2).
- **Accept:** heatmap renders from any timed section; trainer gives per-decision feedback.

### 4.7 Analytics & planner
- Dashboard: score range (last 5, shrinking MoE) vs goal; BR gap trend; Priorities = (1 − accuracy) × expected frequency; Study Quality (accuracy 28 / consistency 27 / review 26 / duration 10 / variety 9); trend over time.
- Planner: phases Foundations → LR → RC → mixed timed + weekly PT → final-week protect; blocks sized to hours/week; days-per-week goal + streak freeze; re-plans on date change or when accuracy data says a phase should extend.
- **Accept:** plan regenerates correctly for Jan / Apr / Jun 2027 and for "undecided"; dashboard loads < 1 s on phone.

### 4.8 AI tutor (grounded)
- Socratic chat over any bank question and any official-reference question Brian is reviewing (he supplies the gist; app supplies tags, his answer, timing, error history). Never gives the answer first; cites the lesson it's drawing on; states uncertainty.
- **Accept:** on 20 seeded bank questions, tutor's stated correct answer matches the key 100%; no response > 250 words by default.

### 4.9 Original question bank (content engine)
- v1 target: 600 LR + 48 RC passages (~300 RC Qs), all tagged (type, logic tags, difficulty 1–4, trap patterns), answer-choice-level explanations.
- Generation pipeline: Claude generates to a strict spec → automated QA (single defensible answer, four nameably-wrong choices, difficulty rubric, no duplicate stimuli) → a second Claude pass as adversarial solver (must agree on the key) → Brian's drill data recalibrates difficulty.
- **Accept:** ≥ 95% of bank items pass adversarial-solver agreement; difficulty distribution ≈ 25/35/25/15 across levels 1–4; frequency by type mirrors the real test.

---

## 5. Phases (build order)

| Phase | Weeks | Ships | Brian can |
|---|---|---|---|
| 0 | 1 | Repo, Supabase schema, onboarding, diagnostic entry, planner v1 | See plan from diagnostic |
| 1 | 1–3 | Unit 0–1 lessons + 4 interactive primitives, drill engine, bank v0 (150 LR), Review Inbox | Start daily study |
| 2 | 3–6 | Units 2–3 (all LR types + tags), BR, error classifier, journal, SRS, bottleneck alerts, bank → 400 LR | Full LR prep |
| 3 | 6–8 | Unit 4 RC + passage-map builder, 48 passages, timing heatmap, skip trainer, PT simulator, LawHub import | Full-test prep |
| 4 | 8–10 | Analytics dashboard, Study Quality, trends, AI tutor, Unit 5–6 | Self-coach |
| 5 | later | Auth tiers, billing, LSAC coaching license + LawHub tether, landing page | Sell it |

Each phase ends with Brian's verification protocol (requirement, build, happy path, edge cases, regressions, no debug output, all tasks).

---

## 6. Open questions (answer at sign-off)
1. Supabase: create a new project in your existing org, or point at one you name? (Free tier is sufficient for personal use.)
2. GitHub: create `brianyu18/apex-lsat` (public or private?), or a different name.
3. Confirm the name, or give one.

---

## 7. Self-review
- Vague language: "fast", "good", "comprehensive" replaced with numbers in §1 and §4. ✔
- Contradictions: planner is date-agnostic (§2) and acceptance tests three dates + undecided (§4.7). ✔ Official questions never stored (§2) and drill sources use "official references" only (§4.3). ✔
- Missing success criteria: every module in §4 has an Accept line; product-level targets in §1. ✔
- Risks flagged: bank quality (mitigated by adversarial-solver QA); planner realism (mitigated by data-driven re-planning); scope (Phase 5 explicitly deferred).
