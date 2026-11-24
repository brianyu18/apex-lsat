import type { WritingPrompt } from "@/components/writing/outline-builder";

/**
 * Original Argumentative Writing prompts in the current LSAT format: a
 * debatable issue, a short context, and three or four perspectives. The
 * student takes a position and engages at least one other perspective.
 * 15 minutes prewriting (guided analysis), 35 minutes writing.
 */
export type LibraryPrompt = WritingPrompt & {
  id: string;
  /** broad subject, for the prompt library */
  area: string;
  /** a full model essay for this prompt is in the writing guide, so it is left out of the random pick */
  model?: boolean;
};

export const WRITING_PROMPTS: LibraryPrompt[] = [
  {
    id: "w-municipal-broadband",
    area: "Local government",
    title: "Municipal broadband",
    context: "The town of Harlow Creek has two private internet providers, both of which serve the dense town center well and the outlying farms poorly or not at all. The town council is considering building a publicly owned fiber network, funded by a thirty-year bond, that would be open to any provider.",
    issue: "Should Harlow Creek build and own a municipal broadband network?",
    perspectives: [
      { label: "A", text: "Yes. Reliable internet is now basic infrastructure, like roads and water. Where private firms will not serve everyone, the public should, and an open network lets private providers compete on top of it." },
      { label: "B", text: "No. Towns have a poor record of running technical utilities; the bond puts taxpayers on the hook for decades if the technology changes or subscribers do not materialize. Subsidize private expansion instead." },
      { label: "C", text: "Only partially. Build the network to the unserved areas alone, where there is no competition to displace, and leave the town center to the existing providers." },
      { label: "D", text: "The question is premature. The council should first require the private providers to publish coverage and speed data by address, then decide based on the actual gap rather than complaints." },
    ],
  },
  {
    id: "w-grade-inflation",
    area: "Education",
    title: "Transcript context",
    context: "At Pemberton College, the median grade has risen from B− to A− over thirty years. The faculty senate is debating whether every transcript should print, beside each course grade, the median grade awarded in that course section.",
    issue: "Should Pemberton print course medians on student transcripts?",
    perspectives: [
      { label: "A", text: "Yes. A grade without context is nearly meaningless to employers and graduate schools; the median restores the information that inflation erased, without forcing any instructor to grade differently." },
      { label: "B", text: "No. Students in rigorously graded departments would be punished twice—lower grades and now a visible comparison—while the real fix is a college-wide grading norm." },
      { label: "C", text: "Yes, but only on the internal transcript used for honors and advising, not the one sent outside, since outside readers will misread a 'B in a B− course' as weakness rather than parity." },
      { label: "D", text: "Neither. Replace letter grades in upper-level courses with brief narrative evaluations, which convey more than any number." },
    ],
  },
  {
    id: "w-rideshare-caps",
    area: "Transport",
    title: "Rideshare vehicle caps",
    context: "Downtown congestion in the city of Avening has worsened as rideshare vehicles now make up roughly a fifth of weekday traffic. The transit authority reports that bus ridership has fallen fourteen percent over the same period.",
    issue: "Should Avening cap the number of rideshare vehicles permitted to operate downtown?",
    perspectives: [
      { label: "A", text: "Yes. A cap directly reduces the vehicles causing the congestion and protects the public transit system that most residents depend on." },
      { label: "B", text: "No. Caps create a licensed cartel, raise fares, and hurt riders in neighborhoods buses do not reach; price congestion itself with a per-trip downtown fee that applies to every car." },
      { label: "C", text: "Cap only during peak hours, when the congestion cost is real, and leave off-peak service unrestricted." },
      { label: "D", text: "The falling bus ridership is the real problem. Spend on bus frequency and dedicated lanes; if buses become faster than rideshare, the market will shrink on its own." },
    ],
  },
  {
    id: "w-ai-authorship",
    area: "Technology",
    title: "Disclosure of writing tools",
    context: "Several academic journals now require authors to disclose any use of automated writing tools, from grammar checkers to text generators. Editors disagree about whether such disclosures should affect how a submission is reviewed.",
    issue: "Should the use of automated writing tools be a factor in how journals evaluate submissions?",
    perspectives: [
      { label: "A", text: "No. A manuscript should be judged on its claims, methods, and evidence. How sentences were produced is as irrelevant as whether the author used a typewriter." },
      { label: "B", text: "Yes. Heavy reliance on generated text raises the odds of fabricated citations and unexamined claims, and reviewers deserve to know where to look harder." },
      { label: "C", text: "Disclosure should be required and published, but never used in the decision: readers, not editors, should weigh it." },
      { label: "D", text: "The line is unworkable. Spell-checkers, translation software, and generators sit on one continuum; journals should drop the disclosure requirement and strengthen checks on citations and data instead." },
    ],
  },
  {
    id: "w-four-day-week",
    area: "Education",
    model: true,
    title: "Four-day school week",
    context: "Marlow County, a rural district of 2,100 students, is considering a four-day school week, with longer days Monday through Thursday. Neighboring districts pay teachers about 10 percent more, and this year Marlow filled three high school math and science positions with long-term substitutes.",
    issue: "Should Marlow County schools move to a four-day week?",
    perspectives: [
      { label: "A", text: "Yes, in every school. A shorter week saves on buses and utilities, and it gives Marlow something to offer teachers that richer districts do not." },
      { label: "B", text: "No. A weekday without school shifts the cost of childcare onto working families, and the students who depend most on school for meals and structure lose a day of both." },
      { label: "C", text: "Keep five days. Find the savings elsewhere, by consolidating bus routes and sharing administrators with a neighboring district, and put that money into salaries." },
      { label: "D", text: "Try it at the high school only, where students need no childcare, and measure the results before deciding anything for younger grades." },
    ],
  },
  {
    id: "w-library-fines",
    area: "Local government",
    model: true,
    title: "Library late fees",
    context: "The Eastbrook Public Library charges 25 cents a day for overdue items. Fines bring in about 1 percent of the library's budget. Roughly one cardholder in six currently has borrowing blocked because of unpaid fines, and those cardholders are concentrated in the city's two lowest-income neighborhoods.",
    issue: "Should the Eastbrook library stop charging overdue fines?",
    perspectives: [
      { label: "A", text: "Yes. Fines keep out the residents who most need a free library, and the money they raise is too small to matter. Drop them and forgive what is owed." },
      { label: "B", text: "No. Fines are how books come back. They teach that borrowing carries a responsibility, and removing them tells patrons that due dates are suggestions." },
      { label: "C", text: "Replace fines with a suspension: no charge, but no further borrowing once an item is three weeks overdue, restored the moment it is returned." },
      { label: "D", text: "Keep fines for adults, waive them for anyone under eighteen, and let any patron clear a balance by volunteering at the library." },
    ],
  },
  {
    id: "w-juror-pay",
    area: "Law and courts",
    title: "Juror pay",
    context: "Jurors in Tolland County are paid $15 a day, a rate set in 1989. About a third of residents summoned ask to be excused for financial hardship, and court staff report that juries skew toward retirees and salaried employees. The county board is considering raising juror pay to $120 a day.",
    issue: "Should Tolland County raise juror pay to $120 a day?",
    perspectives: [
      { label: "A", text: "Yes. A jury that hourly workers cannot afford to sit on is not a cross-section of the community. Paying a living daily rate is the direct fix." },
      { label: "B", text: "No. Jury service is a civic duty, not a job, and the county's budget is already short. Enforce the summons and grant fewer excusals." },
      { label: "C", text: "Raise pay only for jurors whose employers do not pay them during service, verified by a short form. That puts the money where the hardship is." },
      { label: "D", text: "Require employers above a certain size to pay employees' regular wages during jury service, as some states do, and keep the county's rate where it is." },
    ],
  },
  {
    id: "w-donor-default",
    area: "Health policy",
    title: "Organ donor registration",
    context: "In the state of Veridia, residents become registered organ donors only by checking a box when they renew a driver's license. About 40 percent do, though surveys find that roughly 70 percent say they would be willing to donate. A bill would reverse the default: every adult would be registered unless they opt out.",
    issue: "Should Veridia register adults as organ donors by default?",
    perspectives: [
      { label: "A", text: "Yes. Most residents already want to donate and simply never check the box. Changing the default matches the registry to what people say they want, and it saves lives." },
      { label: "B", text: "No. Consent to something this personal should be an act, not an assumption. A person who never thought about the question has not agreed to anything." },
      { label: "C", text: "Require a choice. No one renews a license without answering yes or no, so every registration reflects a decision and no one is enrolled by silence." },
      { label: "D", text: "Keep the current system and spend on outreach. Families often refuse donation at the hospital anyway, so the registry matters less than whether people have talked to their relatives." },
    ],
  },
  {
    id: "w-historic-district",
    area: "Housing",
    title: "Historic district",
    context: "The Carver Hill neighborhood, a mile from downtown Brannock, consists mostly of single-family houses built before 1930. Residents have petitioned the city to designate it a historic district, which would require approval for demolitions and most exterior changes. Rents in Brannock have risen 35 percent in five years.",
    issue: "Should Brannock designate Carver Hill a historic district?",
    perspectives: [
      { label: "A", text: "Yes. Once these houses are gone they cannot be rebuilt. The neighborhood's character is part of what makes the city worth living in, and designation is the only tool that protects it." },
      { label: "B", text: "No. Designation freezes one of the few neighborhoods near downtown where apartments could be built. It protects the views of current owners at the expense of people who need a place to live." },
      { label: "C", text: "Designate the dozen houses of real architectural significance individually, and leave the rest of the neighborhood open to change." },
      { label: "D", text: "Designate the district, but write its rules to allow added units behind and within existing houses, so the street looks the same and holds more people." },
    ],
  },
  {
    id: "w-office-return",
    area: "Work",
    title: "Return to the office",
    context: "The Halden city permitting office has let its 60 staff work from home three days a week since 2020. Processing times for permits are no slower than before. The city manager, citing complaints from residents who could not reach anyone in person and from new hires who say they have learned little, proposes requiring four days a week in the office.",
    issue: "Should the Halden permitting office require staff to work in the office four days a week?",
    perspectives: [
      { label: "A", text: "Yes. A public office should be staffed when the public walks in, and new employees learn the work from the people sitting near them. Output numbers do not capture either." },
      { label: "B", text: "No. The work is getting done on time. Taking away a benefit staff have had for years will cost the office its most experienced people, who can find the same pay elsewhere." },
      { label: "C", text: "Staff the public counter every day on a rotation, pair each new hire with a mentor on shared office days, and leave everyone else's schedule alone." },
      { label: "D", text: "Let each team set its own schedule and hold it accountable for response times and training outcomes, measured and published each quarter." },
    ],
  },
  {
    id: "w-test-optional",
    area: "Education",
    title: "Admissions testing",
    context: "Ashby University stopped requiring standardized test scores for admission four years ago. Applications rose by a third, and the share of first-generation students in the entering class grew from 14 to 19 percent. An internal study found that students admitted without scores earned first-year grades slightly lower than those admitted with them. The faculty is voting on whether to require scores again.",
    issue: "Should Ashby University again require standardized test scores from applicants?",
    perspectives: [
      { label: "A", text: "Yes. Scores are the one measure that is the same for every applicant. Without them, admissions leans harder on essays and activities, which favor students with the most help." },
      { label: "B", text: "No. The policy did what it was meant to do: more students from families without college experience applied and enrolled. A small difference in first-year grades is a fair price." },
      { label: "C", text: "Require scores, but read them against the average for the applicant's high school, so a strong score from a school with few resources counts for more." },
      { label: "D", text: "Stay test-optional and put the effort into first-year advising and tutoring, since the grade gap shows where support is needed, not who should be kept out." },
    ],
  },
  {
    id: "w-fire-rebuild",
    area: "Land use",
    title: "Rebuilding after wildfire",
    context: "A wildfire destroyed 340 homes in the foothill community of Sorrel Ridge, the third major fire there in twenty years. Most owners want to rebuild on their lots. The county must decide whether to issue rebuilding permits; insurers have stopped writing new policies in the area.",
    issue: "Should the county allow homes in Sorrel Ridge to be rebuilt where they stood?",
    perspectives: [
      { label: "A", text: "Yes. These are people's homes and their land. Having lost everything, they should not also lose the right to return, and the county needs the housing." },
      { label: "B", text: "No. The county would be permitting houses it expects to burn, and every resident pays for the firefighting and evacuation. Offer owners fair value for their lots instead." },
      { label: "C", text: "Allow rebuilding only to strict standards: fire-resistant materials, cleared space around each house, and a second evacuation road paid for by a fee on the permits." },
      { label: "D", text: "Let owners decide, but require them to carry private insurance or sign away any claim on public disaster aid. People may take the risk if they bear it." },
    ],
  },
];

/** A prompt not used recently, leaving out the ones with a published model essay. */
export function pickPrompt(exclude: string[] = []) {
  const fresh = WRITING_PROMPTS.filter((p) => !p.model);
  const pool = fresh.filter((p) => !exclude.includes(p.id));
  const list = pool.length ? pool : fresh;
  return list[Math.floor(Math.random() * list.length)];
}

export const PREWRITE_SEC = 15 * 60;
export const WRITE_SEC = 35 * 60;
