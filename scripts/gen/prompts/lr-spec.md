# Apex LSAT — Logical Reasoning question specification

Every original LR item must be indistinguishable in form and rigor from a released LSAT item. This spec is the contract for authoring (by Claude in-session or via `scripts/gen/generate-lr.ts`) and for QA (`scripts/gen/qa-lr.ts`).

## Form
- **Stimulus**: 40–110 words. One of: an argument (premises + conclusion), a set of facts (for MSS/MBT/Explain), or a two-speaker exchange (Point at Issue / Agreement). Natural LSAT register: expert voices ("Economist:", "Columnist:"), hedged academic prose, no pop-culture names, no real living people. Vary topics: science, economics, law/policy, art, history, medicine, business, environment, education, technology, archaeology, linguistics, psychology.
- **Stem**: the canonical LSAC phrasing for the type (see table). Never paraphrase the task in a novel way.
- **Choices**: five, labeled A–E, parallel in grammar, 6–25 words each, no "all of the above", no obviously silly options. The correct answer must not be the longest option more than ~40% of the time across the bank.
- **One defensible key.** A careful 175+ scorer must be able to prove the key and eliminate each wrong answer *for a nameable reason*. No answer may rely on outside knowledge.

## Canonical stems
| type | stem |
|---|---|
| flaw | "The reasoning in the argument is most vulnerable to criticism on the grounds that it" / "The argument is flawed in that it" / "Which one of the following most accurately describes a flaw in the argument's reasoning?" |
| weaken | "Which one of the following, if true, most seriously weakens the argument?" / "…most calls into question…" |
| strengthen | "Which one of the following, if true, most strengthens the argument?" / "…most supports the [person]'s claim?" |
| necessary_assumption | "The argument depends on assuming which one of the following?" / "Which one of the following is an assumption required by the argument?" |
| sufficient_assumption | "The conclusion follows logically if which one of the following is assumed?" / "Which one of the following, if assumed, enables the conclusion to be properly drawn?" |
| most_strongly_supported | "Which one of the following is most strongly supported by the information above?" / "The statements above, if true, most strongly support which one of the following?" |
| must_be_true | "If the statements above are true, which one of the following must also be true?" |
| must_be_false | "If the statements above are true, which one of the following CANNOT be true?" |
| resolve_explain | "Which one of the following, if true, most helps to explain the discrepancy described above?" / "…most helps to resolve the apparent paradox?" |
| main_conclusion | "Which one of the following most accurately expresses the main conclusion of the argument?" |
| argument_part | "The claim that [X] plays which one of the following roles in the argument?" |
| method_of_reasoning | "The argument proceeds by" / "Which one of the following most accurately describes the technique of reasoning used?" |
| parallel_method | "The pattern of reasoning in which one of the following is most similar to that in the argument above?" |
| parallel_flaw | "The flawed reasoning in which one of the following is most similar to that in the argument above?" |
| point_at_issue | "[A] and [B] disagree over whether" / "The dialogue most supports the claim that [A] and [B] disagree about whether" |
| point_of_agreement | "[A] and [B] are committed to agreeing about which one of the following?" |
| principle | "Which one of the following principles, if valid, most helps to justify the reasoning above?" (conform) |
| pseudo_sufficient_assumption | "Which one of the following principles, if valid, most helps to justify the [person]'s reasoning?" / "…most helps to justify the conclusion drawn?" |
| psa_application | "Which one of the following judgments conforms most closely to the principle stated above?" |
| evaluate | "Which one of the following would be most useful to know in evaluating the argument?" |
| fill_in_blank | stimulus ends with "____." and stem "Which one of the following most logically completes the argument?" |
| inference | "Which one of the following can be properly inferred from the statements above?" |

## Wrong answers: every one must carry a trap pattern
Each wrong answer is tempting for exactly one nameable reason, recorded in `trapPatterns`:
`out_of_scope` · `wrong_force` · `reversal` · `premise_booster` · `half_right` · `opposite` · `extreme` · `shell_game` · `comparison_shift` · `wrong_part` · `true_but_irrelevant` · `necessary_v_sufficient`.
Across a question use at least three distinct patterns. The best trap should be the one a 160-scorer picks.

## Difficulty rubric (1–4; target share 25/35/25/15)
- **1**: short stimulus, explicit conclusion indicator, one obvious gap, wrong answers clearly off-task. Expected accuracy 85%+.
- **2**: standard length, familiar pattern (e.g. correlation→causation), one plausible trap. 70–85%.
- **3**: abstract or dense wording, two tempting traps, subtle scope or force issue; the key is phrased unexpectedly. 50–70%.
- **4**: abstract structure (parallel/flaw/SA on conditional chains, quantifier logic, part/whole), the best trap is nearly indistinguishable and must be killed by a single word. 20–50%.

## Logic tags (0–4 per item)
`conditional` `causation` `quantifiers` `link_assumption` `analogy` `eliminating_options` `value_judgment` `weighing_factors` `mental_state_v_reality` `sampling` `part_v_whole` `lack_of_support_v_false` `math_percent` `rule_application` `comparison` `definition_scope`

## Explanations (per choice, 1–3 sentences each)
- Key: state the gap/mechanism and why this choice closes or exposes it.
- Wrong: name the trap pattern in plain words and quote or point to the exact word(s) that kill it ("'most' overstates what 'some' supports").
- `keyTakeaway`: one transferable sentence a student can carry to the next question of this type.
- `predictionHint` (optional): what a strong prephrase looks like before seeing the choices.

## JSON shape
```json
{
  "id": "lr-<type>-<slug>",
  "section": "LR",
  "type": "flaw",
  "logicTags": ["causation"],
  "difficulty": 2,
  "stimulus": "…",
  "stem": "…",
  "choices": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },
  "answer": "C",
  "explanations": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },
  "trapPatterns": { "A": "out_of_scope", "B": "wrong_force", "D": "reversal", "E": "premise_booster" },
  "keyTakeaway": "…",
  "predictionHint": "…"
}
```
One file per batch at `content/bank/lr/<batch>.json` containing an array.

## QA gates (automated in qa-lr.ts)
1. Zod schema passes.
2. Adversarial solver: an independent model, shown only stimulus + stem + choices, must pick the key. Items that fail twice are rejected or rewritten.
3. Key-position balance: no letter > 26% of keys in a batch of ≥ 25.
4. Key-length bias: key is the longest choice in ≤ 40% of items.
5. No duplicate or near-duplicate stimuli (Jaccard on word 3-grams < 0.5).
6. Type and difficulty distribution within ±2 items of batch targets.
