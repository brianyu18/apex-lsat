/**
 * Content for the Argumentative Writing guide (/learn/writing): model essays
 * with paragraph-by-paragraph annotations, a weak essay for contrast, the
 * self-review rubric, sentence upgrades and the preparation plan. All essays
 * and prompts are original. Format facts follow LSAC's published description
 * of LSAT Argumentative Writing.
 */

export interface EssayNote {
  /** a phrase that appears word for word in the paragraph; highlighted when the paragraph is selected */
  quote?: string;
  note: string;
}
export interface EssayParagraph {
  role: string;
  text: string;
  notes: EssayNote[];
}
export interface ModelEssay {
  id: string;
  promptId: string;
  label: string;
  quality: "strong" | "weak";
  /** one line on the approach this essay takes */
  approach: string;
  paragraphs: EssayParagraph[];
  /** what to take from the essay as a whole */
  takeaways: string[];
}

export const MODEL_ESSAYS: ModelEssay[] = [
  {
    id: "four-day-strong",
    promptId: "w-four-day-week",
    label: "Strong essay: a position of the writer's own",
    quality: "strong",
    approach: "Builds its own position out of two perspectives, then answers the strongest objection and a second one.",
    paragraphs: [
      {
        role: "Introduction: thesis, reason, objection named",
        text: "Marlow County should move its high school to a four-day week next fall and keep its elementary and middle schools on five days until the results are in. The district's most pressing problem is that it cannot fill teaching jobs, and that problem is worst at the high school, where a shorter week would help most and harm least. Perspective B is right that a day without school is a real cost to families, but that cost falls mainly on households with young children, which is why the change should start where they are not affected.",
        notes: [
          { quote: "Marlow County should move its high school to a four-day week next fall", note: "The thesis is the first sentence. It says who should do what, and when. There is no warm-up." },
          { quote: "keep its elementary and middle schools on five days until the results are in", note: "The position is the writer's own. It borrows the pilot from Perspective D and the goal from Perspective A, and commits to a specific plan." },
          { quote: "help most and harm least", note: "Both reasons are previewed in four words, so the reader knows the shape of the essay before paragraph two." },
          { quote: "Perspective B is right that", note: "The objection the essay will answer is named in the introduction, with a concession. The reader sees at once that the writer has weighed the other side." },
        ],
      },
      {
        role: "Reason 1, with a mechanism and the prompt's own facts",
        text: "The strongest reason for the change is teacher recruitment, and the need is concentrated at the high school. Marlow cannot match the salaries of the districts around it, so it has to offer something they do not. A four-day week is that offer. It costs the district nothing in pay, and for a physics or math teacher weighing two jobs, a standing three-day weekend is a benefit that a few thousand dollars more elsewhere may not outweigh. This year three of the high school's math and science positions were filled by long-term substitutes. A student who spends a year of algebra with a series of substitutes loses far more instruction than one who has a qualified teacher for four longer days a week.",
        notes: [
          { quote: "The strongest reason for the change is teacher recruitment", note: "The topic sentence states the reason. A reader who reads only first sentences can follow the whole argument." },
          { quote: "so it has to offer something they do not", note: "This is a mechanism: it explains why the reason works, step by step, instead of asserting it." },
          { quote: "three of the high school's math and science positions were filled by long-term substitutes", note: "A fact taken from the prompt and put to work. Using the given material shows you read it closely." },
          { quote: "loses far more instruction than one who has a qualified teacher for four longer days a week", note: "The paragraph ends on a consequence that ties the reason back to students, which is what the decision is about." },
        ],
      },
      {
        role: "Reason 2, with a concrete comparison",
        text: "The second reason is that the costs of a shorter week fall most lightly on high school students. A seven-year-old cannot be left at home on a Friday. A sixteen-year-old can, and many already spend Fridays leaving class early for away games, part-time jobs, or work on family farms. Moving that lost time into a planned day off, and making up the hours Monday through Thursday, turns scattered absences into a schedule. For younger children the calculation is different, because every Friday without school is a day a parent must pay for care or miss work. Starting with the high school captures most of the benefit while placing no new burden on those families.",
        notes: [
          { quote: "The second reason is that the costs of a shorter week fall most lightly on high school students", note: "A second, separate reason. It could be false while the first stayed true, which is the test that it is not a restatement." },
          { quote: "A seven-year-old cannot be left at home on a Friday. A sixteen-year-old can", note: "Two short sentences make the point concrete. Specific ages are easier to picture than “younger and older students”." },
          { quote: "turns scattered absences into a schedule", note: "Plain words, one clear image. Nothing here needed a long word." },
          { quote: "captures most of the benefit while placing no new burden on those families", note: "The last sentence returns to the thesis and explains its limit: why the high school only." },
        ],
      },
      {
        role: "Objection and reply: concede, distinguish, answer",
        text: "Perspective B raises the most serious objection. School is where some students get their only reliable meals and their only quiet place to work, and that is true of teenagers as well as young children. The objection is correct, but it argues for keeping a building open, not for holding classes. Marlow can open the high school cafeteria and library on Fridays, staffed by aides, for any student who wants to come, at a small fraction of what a full day of instruction and bus service costs. Perspective A would go further and convert every school at once, since the savings would be larger. But the district has no evidence yet about how its own students fare on the new schedule, and it should not run that experiment first on the children whose families have the least room to absorb a mistake.",
        notes: [
          { quote: "Perspective B raises the most serious objection", note: "The essay picks the perspective that most threatens its thesis, not the easiest one to dismiss." },
          { quote: "that is true of teenagers as well as young children", note: "A full concession. The writer admits the objection applies to the very students the plan affects, which makes the reply more credible." },
          { quote: "it argues for keeping a building open, not for holding classes", note: "The distinction: what the objection actually requires is narrower than what it claims. This is the sentence the paragraph turns on." },
          { quote: "Marlow can open the high school cafeteria and library on Fridays", note: "A practical answer, not a dismissal. The objection is met with something the district could do." },
          { quote: "Perspective A would go further", note: "A second perspective is engaged in two sentences. Addressing more than one view is a way to stand out, as long as each gets a real answer." },
        ],
      },
      {
        role: "Close: one sentence",
        text: "A high school pilot gives Marlow its best recruiting tool now and a year of its own evidence before it asks anything of families with young children.",
        notes: [
          { quote: "its best recruiting tool now and a year of its own evidence", note: "One sentence that restates the thesis as a payoff. No new argument and no summary of each paragraph." },
          { note: "About 500 words in five paragraphs. That is a realistic length for 35 minutes with four minutes left to reread." },
        ],
      },
    ],
    takeaways: [
      "Position in sentence one, and it is a specific plan.",
      "Each body paragraph opens with its reason and contains a mechanism, an example or a consequence.",
      "The prompt's own facts are used as evidence.",
      "The strongest objection is conceded in full, then answered with a distinction.",
      "Short, plain sentences throughout.",
    ],
  },
  {
    id: "library-strong",
    promptId: "w-library-fines",
    label: "Strong essay: defending one of the given perspectives",
    quality: "strong",
    approach: "Adopts Perspective C, but supplies reasons of its own and answers two rivals.",
    paragraphs: [
      {
        role: "Introduction: thesis and the idea behind it",
        text: "Eastbrook's library should stop charging daily overdue fines and instead suspend borrowing for any patron who keeps an item more than three weeks past its due date. Fines are meant to bring books back, but in Eastbrook they mostly keep readers out, and a suspension does the first job without the second cost.",
        notes: [
          { quote: "should stop charging daily overdue fines and instead suspend borrowing", note: "The thesis adopts Perspective C. That is allowed; what matters is that the reasons that follow are the writer's own." },
          { quote: "Fines are meant to bring books back, but in Eastbrook they mostly keep readers out", note: "The whole argument in one sentence: the policy's purpose, and how it is failing at it. Two sentences is enough for an introduction." },
        ],
      },
      {
        role: "Reason 1: the current policy fails by its own standard",
        text: "Fines are failing at their own purpose. A fine works only on a patron who intends to come back and can pay; for that patron, a quarter a day is a nudge. For a patron who cannot spare ten dollars, the fine is a reason to stay away, and the book stays away too. The numbers in Eastbrook fit this pattern. One cardholder in six is blocked for unpaid fines, and those cardholders are concentrated in the two lowest-income neighborhoods. Those are thousands of residents the library was built to serve who are not using it, and each of them may be holding a book they have no reason to return. The fine was supposed to recover the book and keep the reader. In these neighborhoods it is losing both.",
        notes: [
          { quote: "Fines are failing at their own purpose", note: "A strong way to argue against a policy: judge it by the goal its defenders give for it." },
          { quote: "For a patron who cannot spare ten dollars, the fine is a reason to stay away, and the book stays away too", note: "The mechanism, explained through one imagined patron. It shows how the fine produces the opposite of what it intends." },
          { quote: "One cardholder in six is blocked for unpaid fines", note: "The prompt's statistic, used as evidence for the mechanism just described." },
        ],
      },
      {
        role: "Reason 2: the alternative keeps what works",
        text: "A suspension keeps the incentive and removes the barrier. Under it, a late book costs a patron the one thing the library offers, the ability to borrow, and returning the book restores it at once. Nothing has to be paid, so no one is locked out by a debt, and the patron who owes a book has every reason to walk back in with it. The cost to the library is small. Fines supply about one percent of its budget, and collecting them takes staff time that could go to the front desk.",
        notes: [
          { quote: "A suspension keeps the incentive and removes the barrier", note: "The topic sentence answers the obvious question left by paragraph two: if not fines, then what?" },
          { quote: "returning the book restores it at once", note: "The detail that makes the proposal work. It shows the writer thought the policy through." },
          { quote: "Fines supply about one percent of its budget", note: "The cost of the proposal is addressed before a reader can raise it." },
        ],
      },
      {
        role: "Objection and reply",
        text: "Perspective B objects that fines teach responsibility and that removing them tells patrons that due dates do not matter. The concern is fair. A library with no consequence for lateness would see its most popular books vanish for months. But a suspension is a consequence, and a more direct one than a fine. It ties the penalty to the act itself and ends when the patron makes it right, which is closer to what responsibility means than a charge that grows whether or not the patron can pay it. Perspective D would keep fines and waive them for children, but that leaves the adults in those same two neighborhoods where they are now.",
        notes: [
          { quote: "The concern is fair", note: "The concession is short and sincere, followed by the worst case the objection fears." },
          { quote: "But a suspension is a consequence, and a more direct one than a fine", note: "The reply accepts the objector's value, responsibility, and shows the proposal serves it better." },
          { quote: "Perspective D would keep fines and waive them for children", note: "A second rival, dealt with in one sentence by pointing to who it leaves out." },
        ],
      },
      {
        role: "Close",
        text: "The library exists to put books in residents' hands and to get them back. A suspension does both, and in Eastbrook a fine is doing neither well.",
        notes: [
          { quote: "A suspension does both", note: "The close returns to the purpose named in the introduction. About 420 words in all: shorter than the first essay, and complete." },
        ],
      },
    ],
    takeaways: [
      "You may adopt a given perspective, but the reasoning must be yours.",
      "Judging a policy by its own stated purpose is a reliable line of argument.",
      "Answer the practical question a reader will ask: what does this cost?",
      "A complete 420-word essay beats an unfinished 700-word one.",
    ],
  },
  {
    id: "four-day-weak",
    promptId: "w-four-day-week",
    label: "Weak essay on the same prompt, for contrast",
    quality: "weak",
    approach: "Typical of an unplanned essay: it summarizes, hedges and never answers an objection.",
    paragraphs: [
      {
        role: "Introduction with no position",
        text: "In today's society, education is one of the most important issues facing communities across the country. The question of whether schools should have a four-day week is a complex one with many sides. There are several perspectives on this issue, and each of them has strengths and weaknesses that should be considered carefully before any decision is made.",
        notes: [
          { quote: "In today's society, education is one of the most important issues", note: "A filler opening. It could begin any essay on any topic, and it spends the reader's first seconds on nothing." },
          { quote: "a complex one with many sides", note: "No thesis. After a full paragraph the reader still does not know what the writer thinks." },
        ],
      },
      {
        role: "Summary of the prompt",
        text: "Perspective A says that a four-day week would save money and help with teachers. Perspective B says that it would be bad for families and for students who need meals. Perspective C says the district should keep five days and save money another way. Perspective D says to try it at the high school first. All of these perspectives make good points.",
        notes: [
          { quote: "Perspective A says", note: "This paragraph restates the prompt. The reader already has the prompt; the task is to argue, not to summarize." },
          { quote: "All of these perspectives make good points", note: "Hedging. Agreeing with everyone is not a position." },
        ],
      },
      {
        role: "A position, finally, without support",
        text: "I think that the four-day week is probably a good idea because it would help the district. Teachers would like it and it would save money, which is very important. Schools need good teachers and this would definitely help a lot with that problem in my opinion.",
        notes: [
          { quote: "I think that the four-day week is probably a good idea", note: "The position arrives in paragraph three, softened by “I think” and “probably”." },
          { quote: "because it would help the district", note: "A restatement, not a reason. It says the idea is good because it is good." },
          { quote: "Teachers would like it and it would save money", note: "Claims with nothing under them: no mechanism, no example, none of the facts the prompt supplied." },
        ],
      },
      {
        role: "Conclusion that takes it back",
        text: "In conclusion, there are many things to think about. While a four-day week could be good, it could also cause problems, so the district should think carefully and do what is best for everyone.",
        notes: [
          { quote: "it could also cause problems", note: "The objection is mentioned and never answered. Engaging another perspective is the one move the task requires." },
          { quote: "do what is best for everyone", note: "The essay ends without a recommendation. About 200 words: too short, and not because of the clock. There was no plan." },
        ],
      },
    ],
    takeaways: [
      "No thesis until paragraph three, and it is hedged.",
      "A paragraph spent summarizing the prompt.",
      "Reasons that restate the claim, with no support.",
      "No objection answered.",
      "Every one of these is fixed by 15 minutes of prewriting.",
    ],
  },
];

export const FORMAT_FACTS: { label: string; value: string; note: string }[] = [
  { label: "Time", value: "50 minutes", note: "15 minutes of prewriting, then 35 minutes to write. After 5 minutes of prewriting you may move on early." },
  { label: "Prompt", value: "1 issue, 3–4 perspectives", note: "A debatable question, a short context, and a few sentences for each perspective." },
  { label: "Task", value: "Argue a position", note: "Take your own position, defend it, and address ideas from the other perspectives." },
  { label: "Scoring", value: "Unscored", note: "There is no number. Schools you apply to receive the essay itself." },
  { label: "Where and when", value: "At home, on demand", note: "Online with remote proctoring, from eight days before your test date." },
  { label: "Required", value: "Yes", note: "Your LSAT score is not released until an approved writing sample is on file." },
];

export const LOGISTICS: string[] = [
  "It opens eight days before your test date. Do it in that window, before test day, so nothing holds up your score.",
  "One sitting is included with your first LSAT registration. A sample already on file from an earlier test counts.",
  "You need a quiet room, a computer with a webcam and microphone, a stable connection and a government photo ID.",
  "No paper or pens. Notes go in the built-in digital scratch area.",
  "The prewriting screen shows guided questions to help you analyze the perspectives. Use them.",
  "Your room, screen and audio are recorded and reviewed, so follow the rules exactly.",
  "Try the free official practice prompt in LawHub once, to see the real interface.",
];

export const READER_WANTS: { title: string; body: string }[] = [
  { title: "Can you write a clear argument unaided?", body: "Readers are checking for a coherent position, reasons that follow, and prose they can read once and understand. Logic and flow matter more than perfect proofreading." },
  { title: "Is this the same writer as the personal statement?", body: "The essay is the only writing in your file produced under supervision. A reader who doubts a polished personal statement will compare the two voices." },
  { title: "Is there anything alarming?", body: "A blank or very short response, an incoherent one, an essay that ignores the task, or inappropriate content gets noticed. These are the ways the essay can hurt you." },
];

export const STAND_OUT: { title: string; body: string }[] = [
  { title: "A thesis with an edge", body: "State a specific plan with its limit: who, what, and under what condition. “The high school now, the lower grades later” is more persuasive than “yes”." },
  { title: "The hardest objection, fully conceded", body: "Most essays answer the weakest opposing view. Take on the strongest, admit what is right about it, and answer it with a distinction." },
  { title: "The prompt's facts, put to work", body: "Quote a number or detail from the context as evidence. It shows close reading, which is the skill law school runs on." },
  { title: "Mechanisms, not adjectives", body: "Explain how your reason produces the result. “Important” and “beneficial” prove nothing; a cause-and-effect sentence does." },
  { title: "Plain, exact sentences", body: "Write the way a good lawyer writes: subject, verb, point. Clear prose is rarer than elaborate prose, and it reads as confidence." },
  { title: "A finished essay", body: "Five complete paragraphs and a one-sentence close. An essay that stops mid-thought leaves the reader with the wrong last impression." },
];

export const BLUEPRINT: { part: string; minutes: number; clock: string; job: string; opener: string }[] = [
  { part: "Introduction", minutes: 5, clock: "30:00", job: "Thesis in sentence one. Preview your two reasons. Name the perspective you will answer.", opener: "[Who] should [do what], because [reason 1] and [reason 2]." },
  { part: "Reason 1", minutes: 8, clock: "22:00", job: "Your strongest reason, with a mechanism, an example or a consequence under it.", opener: "The strongest reason is that …" },
  { part: "Reason 2", minutes: 8, clock: "14:00", job: "A separate reason that could be true even if the first were not.", opener: "The second reason is that …" },
  { part: "Objection and reply", minutes: 8, clock: "6:00", job: "Name the strongest opposing perspective, concede what it gets right, show what it misses, and say why your thesis holds.", opener: "Perspective [X] raises the most serious objection: … That is right, but …" },
  { part: "Close", minutes: 2, clock: "4:00", job: "One sentence that restates the thesis as a payoff. No new points.", opener: "[Your plan] gives [the decision-maker] [benefit] without [cost]." },
  { part: "Reread", minutes: 4, clock: "0:00", job: "Fix unclear sentences and typos. Do not rewrite.", opener: "" },
];

export const UPGRADES: { move: string; weak: string; strong: string; why: string }[] = [
  {
    move: "Thesis",
    weak: "I think there are good arguments on both sides, but raising juror pay is probably a good idea.",
    strong: "Tolland County should raise juror pay to $120 a day, because a jury that hourly workers cannot afford to sit on is not drawn from the whole community.",
    why: "No “I think”, no “probably”. A subject, a verb, a claim and its ground.",
  },
  {
    move: "Reason",
    weak: "Raising pay is the right thing to do for the county.",
    strong: "At $15 a day, serving on a jury costs an hourly worker most of a day's wages, so the people excused for hardship are disproportionately the working poor.",
    why: "The weak version restates the thesis. The strong one could be checked, and it explains a cause.",
  },
  {
    move: "Support",
    weak: "This would be very beneficial and help a lot of people.",
    strong: "A third of those summoned already ask to be excused for hardship. At $120, a week of service no longer means a week without rent money.",
    why: "A number from the prompt and a concrete consequence replace two adjectives.",
  },
  {
    move: "Concession",
    weak: "Some people disagree, but they are wrong.",
    strong: "Perspective B is right that jury service is a duty and not a job, and that the county's budget is already short.",
    why: "State the other side in words its holder would accept. A fair concession makes your reply believable.",
  },
  {
    move: "Reply",
    weak: "However, I still believe my position is better.",
    strong: "But a duty that only some residents can afford to perform is not being shared, and the cost of unrepresentative juries is paid in verdicts.",
    why: "The reply gives a reason the concession does not defeat.",
  },
  {
    move: "Close",
    weak: "In conclusion, this is a complicated issue and the county should consider all options carefully.",
    strong: "Paying jurors a day's wage is what it costs to have juries that look like the county.",
    why: "One sentence, committed, with nothing taken back.",
  },
];

export const RUBRIC: { id: string; name: string; levels: [string, string, string]; fix: string }[] = [
  {
    id: "position",
    name: "Position",
    levels: ["No clear position, or it changes.", "A position appears, but late or hedged (“I think”, “probably”).", "A specific thesis in the first paragraph, stated as a claim."],
    fix: "Write the thesis first, as “[who] should [what], because …”, and paste it in as sentence one.",
  },
  {
    id: "reasons",
    name: "Reasons and support",
    levels: ["Claims are repeated or unsupported.", "Two reasons, but one restates the thesis or lacks support.", "Two distinct reasons, each with a mechanism, example or consequence."],
    fix: "Under each reason, answer “how do you know?” with one concrete sentence before moving on.",
  },
  {
    id: "engagement",
    name: "Other perspectives",
    levels: ["No other perspective is addressed.", "A perspective is mentioned, or an easy one is dismissed.", "The strongest opposing perspective is named, conceded and answered."],
    fix: "In prewriting, rank the perspectives and plan your reply to the one that most threatens you.",
  },
  {
    id: "organization",
    name: "Organization",
    levels: ["Ideas run together; hard to follow.", "Paragraphs exist, but some mix ideas or lack a topic sentence.", "One job per paragraph, each opening with its point; a one-sentence close."],
    fix: "Use the five-paragraph blueprint every time until it is automatic.",
  },
  {
    id: "prose",
    name: "Clarity of prose",
    levels: ["Frequent errors or sentences that must be reread.", "Readable, with filler, padding or a few tangled sentences.", "Plain, direct sentences; few errors; no filler openers."],
    fix: "In the four-minute reread, cut filler openers and split any sentence you stumble on.",
  },
  {
    id: "task",
    name: "Task and completeness",
    levels: ["Unfinished, off the question, or under about 250 words.", "Finished, but ignores the prompt's facts or summarizes the perspectives.", "Finished, about 400–600 words, and uses details from the prompt as evidence."],
    fix: "Follow the minute budget; if behind at 20:00, shorten the remaining paragraphs and still write the objection.",
  },
];

export const PREP_PLAN: { step: string; time: string; what: string; href?: string; cta?: string }[] = [
  { step: "Learn the task", time: "30 min", what: "Read the three Unit 6 lessons: what the essay is, the 15 minutes, and writing under the clock.", href: "/learn/u6/the-task", cta: "Open Unit 6" },
  { step: "Study the models", time: "20 min", what: "Click through both strong essays on this page and the weak one. Say in your own words what each paragraph is doing." },
  { step: "Outline without writing", time: "2 × 15 min", what: "Run the prewriting clock on two prompts and stop when it ends. A complete outline in 15 minutes is the skill that decides the essay.", href: "/test/writing", cta: "Open practice" },
  { step: "Write three timed essays", time: "3 × 50 min", what: "One a week, both clocks, a prompt you have not seen. Do not go over time." },
  { step: "Reread the next day", time: "10 min each", what: "Score each essay with the rubric on this page a day later, when you read it as a stranger would. Pick one thing to fix next time." },
  { step: "See the real interface", time: "50 min", what: "Do the free official practice prompt in LawHub once, in the room and on the computer you will use." },
  { step: "Take it early", time: "Test week", what: "Sit the real essay in the eight days before your test date, on a day when you are rested." },
];

/** Split a paragraph into plain and highlighted runs for the given quotes. */
export function highlightRuns(text: string, quotes: string[]): { text: string; mark: boolean }[] {
  const spans = quotes
    .map((q) => ({ at: text.indexOf(q), len: q.length }))
    .filter((s) => s.at >= 0)
    .sort((a, b) => a.at - b.at);
  const runs: { text: string; mark: boolean }[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.at < pos) continue; // overlapping quote: keep the earlier one
    if (s.at > pos) runs.push({ text: text.slice(pos, s.at), mark: false });
    runs.push({ text: text.slice(s.at, s.at + s.len), mark: true });
    pos = s.at + s.len;
  }
  if (pos < text.length) runs.push({ text: text.slice(pos), mark: false });
  return runs;
}

export function essayWordCount(e: ModelEssay): number {
  return e.paragraphs.reduce((a, p) => a + p.text.trim().split(/\s+/).length, 0);
}
