# Bring your own test — the `apex-test/1` format

Upload at **Test → Your own tests** (`/test/custom`). One JSON file is one test. The app validates the file, shows a preview, and stores it only in your private database (question rows are marked `private`; nothing is written to the repository). You take it in the LawHub-style interface with blind review, scoring, analytics and the tutor.

You are responsible for having the right to use whatever you upload: your own questions, openly licensed material, or material whose owner permits this use.

## Shape

```jsonc
{
  "format": "apex-test/1",          // required, exactly this
  "id": "APEX-PT000-2024",           // optional — your own identifier; a second upload with the same id is refused
  "number": 0,                       // optional — your test number (shown in the list)
  "year": 2024,                      // optional
  "title": "My practice test 1",     // required, ≤ 120 chars
  "description": "…",                // optional
  "totals": { "sections": 2, "questions": 2, "scoredQuestions": 2 },   // optional checksum — each count given must match the file
  "sections": [                      // 1–4 sections; taken in "order" when every section has one, else in file order; 10-min break after section 2 when there are 3+
    {
      "id": "APEX-PT000-2024-S1",    // optional, unique within the file
      "order": 1,                    // optional — give it on every section or on none
      "kind": "LR",                  // Logical Reasoning
      "scored": true,                // optional, default true (false = experimental: recorded, not scored)
      "minutes": 35,                 // optional, default 35 (5–120)
      "directions": "…",             // optional
      "credits": ["…"],              // optional — source credits
      "questions": [                 // 1–30
        {
          "number": 1,               // optional — give it on every question in the section or on none; must run 1, 2, 3… in file order
          "id": "APEX-PT000-2024-S1-Q01",   // optional, unique within the file
          "stimulus": "…",           // required for LR
          "stem": "…",               // required
          "choices": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },   // required, exactly A–E
          "answer": "C",             // required, A–E
          "explanations": { "A": "…", "C": "…" },   // optional — per-choice notes (any subset)
          "explanation": "…",        // optional — why the answer is right
          "type": "weaken",          // optional — see types below; anything else imports as "unclassified" with a warning
          "category": "…",           // optional — your own grouping, stored with the question
          "skill": "…",              // optional — stored with the question
          "difficulty": 2            // optional, 1–5 (default 2; 5 is stored as 4, the app's top level)
        }
      ]
    },
    {
      "id": "APEX-PT000-2024-S2",
      "order": 2,
      "kind": "RC",                  // Reading Comprehension
      "passages": [                  // 1–6
        {
          "id": "APEX-PT000-2024-S2-P1",   // optional, unique within the file
          "title": null,             // optional (null allowed)
          "subject": "…",            // optional
          "comparative": false,      // optional — when true, paragraphsB is required
          "paragraphs": ["…", "…"],  // required, 1–12 strings
          "paragraphsB": ["…"],      // Passage B for comparative reading
          "credits": ["…"],          // optional
          "questions": [             // 1–12; same fields as LR minus "stimulus", plus "reference"
            {
              "number": 1, "id": "APEX-PT000-2024-S2-Q01",
              "stem": "…", "choices": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" }, "answer": "B", "type": "main_point",
              "reference": { "text": "…", "paragraph": 0 }   // optional — the passage text the question points at; paragraph is 0-based; add "passage": "B" for Passage B. Shown above the passage while that question is open.
            }
          ]
        }
      ]
    }
  ]
}
```

Unknown fields are rejected, so typos are caught at upload. Optional text fields may be `null`. Plain text only (no HTML); use `\n` for line breaks inside a string.

Question numbers run across the whole section, so in an RC section the second passage continues where the first stopped.

## What the indexing fields do

- `totals`, `number` and the unique-id rules are integrity checks: a file with a dropped or duplicated question fails at "Check file" instead of producing a wrong score.
- `scored` decides what counts: raw score = correct answers in scored sections; the scaled score is estimated from that.
- Test `id`, `number`, `year`, section `id`, question `id`, `category`, `skill`, passage `subject` and `credits` are stored with the test so results can be traced back to your own numbering. Analytics group by `type`, not by `category` or `skill`.

## Optional `type` values

Giving a type lets analytics group your results. Matching ignores case and punctuation ("Main Point" = `main_point`). Omit it, or give a value not listed here, and the question is "unclassified".

- **LR:** `flaw`, `most_strongly_supported`, `necessary_assumption`, `weaken`, `resolve_explain`, `strengthen`, `pseudo_sufficient_assumption`, `sufficient_assumption`, `main_conclusion`, `argument_part`, `parallel_flaw`, `parallel_method`, `point_at_issue`, `must_be_true`, `fill_in_blank`, `method_of_reasoning`, `principle`, `psa_application`, `inference`, `evaluate`, `must_be_false`, `point_of_agreement` (`LR_TYPES` in `lib/content/taxonomy.ts`).
- **RC:** `main_point`, `purpose_of_passage`, `purpose_of_paragraph`, `purpose_in_context`, `organization`, `stated`, `meaning_in_context`, `author_perspective`, `author_attitude`, `other_perspective`, `application`, `analogy`, `principle`, `weaken_strengthen_evaluate`, `relationship`, `approach` (`RC_QTYPES` in the same file).

## Getting a starting file

`/api/custom/template` (the "Download the template" link on the page) returns a small working example with one LR and one RC section (the same file as `docs/custom-test/sample-test.json`); `docs/custom-test/blank-template.json` is the empty skeleton. Validation errors name the exact path, e.g. `sections.0.questions.3.choices.E: Required`.

## What happens after upload
- **Take**: each section runs on its own clock; flagged and blank questions go to blind review; you get timed and blind-review scaled scores.
- Results count toward your score range and analytics; misses land in the Review Inbox, where the tutor has the full question.
- **Delete** removes the test; questions you already attempted are kept so your history stays intact.
