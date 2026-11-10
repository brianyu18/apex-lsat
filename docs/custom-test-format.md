# Bring your own test — the `apex-test/1` format

Upload at **Test → Your own tests** (`/test/custom`). One JSON file is one test. The app validates the file, shows a preview, and stores it only in your private database (question rows are marked `private`; nothing is written to the repository). You take it in the LawHub-style interface with blind review, scoring, analytics and the tutor.

You are responsible for having the right to use whatever you upload: your own questions, openly licensed material, or material whose owner permits this use.

## Shape

```jsonc
{
  "format": "apex-test/1",          // required, exactly this
  "title": "My practice test 1",     // required, ≤ 120 chars
  "sections": [                      // 1–4 sections, taken in order; 10-min break after section 2 when there are 3+
    {
      "kind": "LR",                  // Logical Reasoning
      "scored": true,                // optional, default true (false = experimental: recorded, not scored)
      "minutes": 35,                 // optional, default 35 (5–120)
      "questions": [                 // 1–30
        {
          "stimulus": "…",           // required for LR
          "stem": "…",               // required
          "choices": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },   // required, exactly A–E
          "answer": "C",             // required, A–E
          "type": "weaken",          // optional — see LR types below
          "difficulty": 2,           // optional, 1–4 (default 2)
          "explanation": "…",        // optional — why the answer is right
          "explanations": { "A": "…", "C": "…" }   // optional — per-choice notes (any subset)
        }
      ]
    },
    {
      "kind": "RC",                  // Reading Comprehension
      "passages": [                  // 1–6
        {
          "title": "…",              // optional
          "paragraphs": ["…", "…"],  // required, 1–12 strings
          "paragraphsB": ["…"],      // optional — Passage B for comparative reading
          "questions": [             // 1–12; same fields as LR minus "stimulus"
            { "stem": "…", "choices": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" }, "answer": "B", "type": "main_point" }
          ]
        }
      ]
    }
  ]
}
```

Unknown fields are rejected, so typos are caught at upload. Plain text only (no HTML); use `\n` for line breaks inside a string.

## Optional `type` values

Giving a type lets analytics group your results; omit it and the question is "unclassified".

- **LR:** `flaw`, `most_strongly_supported`, `necessary_assumption`, `weaken`, `resolve_explain`, `strengthen`, `pseudo_sufficient_assumption`, `sufficient_assumption`, `main_conclusion`, `argument_part`, `parallel_flaw`, `parallel_method`, `point_at_issue`, `must_be_true`, `fill_in_blank`, `method_of_reasoning`, `principle`, `psa_application`, `inference`, `evaluate`, `must_be_false`, `point_of_agreement` (`LR_TYPES` in `lib/content/taxonomy.ts`).
- **RC:** `main_point`, `purpose_of_passage`, `purpose_of_paragraph`, `purpose_in_context`, `organization`, `stated`, `meaning_in_context`, `author_perspective`, `author_attitude`, `other_perspective`, `application`, `analogy`, `principle`, `weaken_strengthen_evaluate`, `relationship`, `approach` (`RC_QTYPES` in the same file).

## Getting a starting file

`/api/custom/template` (the "Download the template" link on the page) returns a small working example with one LR and one RC section. Validation errors name the exact path, e.g. `sections.0.questions.3.choices.E: Required`.

## What happens after upload
- **Take**: each section runs on its own clock; flagged and blank questions go to blind review; you get timed and blind-review scaled scores.
- Results count toward your score range and analytics; misses land in the Review Inbox, where the tutor has the full question.
- **Delete** removes the test; questions you already attempted are kept so your history stays intact.
