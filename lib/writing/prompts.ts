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
  {
    id: "w-attendance",
    area: "Education",
    model: true,
    title: "Lecture attendance",
    context: "Brightwater University's faculty senate has found that attendance in large lecture courses falls below half by the middle of each term, and that first-year students who miss more than a third of their lectures fail at three times the rate of those who attend. A proposal before the senate would make attendance in all lecture courses mandatory, recorded by card swipe, with a grade penalty after four absences.",
    issue: "Should Brightwater make lecture attendance mandatory?",
    perspectives: [
      { label: "A", text: "Yes. Attendance and performance rise together, and students often do not see the cost of skipping until it is too late. The university admits these students and takes their tuition; it owes them a structure that keeps them from failing." },
      { label: "B", text: "No. University students are adults, and a grade should measure what a student has learned, not where the student was sitting. A penalty for absence punishes the student who learns well from the recordings and the reading." },
      { label: "C", text: "Require attendance in first-year courses only. New students are the ones still learning how to manage their time, and they are the ones the failure figures describe." },
      { label: "D", text: "Leave it to each instructor. A discussion-based lecture and a four-hundred-seat survey course are different things, and the person teaching the course is best placed to know whether presence matters in it." },
    ],
  },
  {
    id: "w-legal-practitioners",
    area: "Law and courts",
    model: true,
    title: "Licensed legal practitioners",
    context: "In the state of Carrow, nine out of ten tenants facing eviction appear in court without a lawyer, while most landlords are represented. The state supreme court is considering a rule that would let trained non-lawyers, licensed after a one-year course and an examination, advise tenants and speak for them at eviction hearings.",
    issue: "Should Carrow license non-lawyers to represent tenants in eviction cases?",
    perspectives: [
      { label: "A", text: "Yes. A tenant with some trained help is far better off than a tenant with none, and there will never be enough free lawyers to meet the need. Medicine and engineering already rely on licensed practitioners who are not doctors or engineers." },
      { label: "B", text: "No. Eviction law has traps that a one-year course will not cover, and a tenant who loses because of poor advice gets no second chance. The state should pay for more legal aid lawyers instead of building a lesser service for people who cannot afford one." },
      { label: "C", text: "Allow the practitioners to advise tenants and prepare their papers, but not to speak in court, where mistakes are hardest to undo." },
      { label: "D", text: "Try it in two counties for three years and compare the outcomes with the rest of the state before deciding." },
    ],
  },
  {
    id: "w-speed-cameras",
    area: "Public safety",
    model: true,
    title: "School-zone speed cameras",
    context: "In the city of Lakemont, eleven children have been struck by cars near schools in the past three years, and the police say they can staff a patrol at each school zone only a few days a month. The council is considering automated cameras that would mail a $75 ticket to the owner of any car traveling more than ten miles an hour over the limit in a school zone.",
    issue: "Should Lakemont install speed cameras in its school zones?",
    perspectives: [
      { label: "A", text: "Yes. Cameras enforce the limit every day, without favoritism, at a fraction of the cost of patrols. Drivers slow down where they know they will be caught." },
      { label: "B", text: "No. Cameras are a form of surveillance that tends to spread, cities come to depend on the ticket revenue, and a flat $75 fine is a nuisance to some households and a week of groceries to others." },
      { label: "C", text: "Install the cameras, but send only warnings for the first sixty days and for each driver's first violation, and scale the fines to income after that." },
      { label: "D", text: "Rebuild the streets instead. Speed humps, narrower lanes and raised crosswalks slow every car without a ticket, a camera or a database." },
    ],
  },
  {
    id: "w-leaf-blowers",
    area: "Environment",
    title: "Gas leaf blowers",
    context: "Residents of the town of Wexley have filed a growing number of complaints about the noise and exhaust of gas-powered leaf blowers. About forty landscaping businesses work in the town, most of them crews of two or three people. Battery-powered blowers are quieter, cost roughly twice as much, and run for under an hour on a charge. The council is considering a ban on gas blowers beginning next spring.",
    issue: "Should Wexley ban gas-powered leaf blowers?",
    perspectives: [
      { label: "A", text: "Yes. The noise and fumes are imposed on neighbors who never agreed to them, and quieter equipment exists. A clear ban with a date is the only rule that will actually be followed." },
      { label: "B", text: "No. The cost falls on small crews with thin margins, and battery tools cannot finish a large property on one charge. Limit the hours when blowers may be used instead." },
      { label: "C", text: "Phase the ban in over three years, and have the town pay part of the cost of trading in gas equipment." },
      { label: "D", text: "Start with the town's own crews and contractors. If the battery equipment holds up through two full seasons of public work, extend the rule to everyone." },
    ],
  },
  {
    id: "w-phone-ban",
    area: "Education",
    title: "Phones in school",
    context: "At Ridgemont High School, two-thirds of teachers report spending class time every day dealing with students' phones. The principal has proposed that every student lock their phone in a sealed pouch at the first bell and unlock it at the last. Several parents have objected that they would lose the ability to reach their children during the day.",
    issue: "Should Ridgemont require students' phones to be locked away for the whole school day?",
    perspectives: [
      { label: "A", text: "Yes. Partial rules have failed because every teacher has to enforce them alone. A phone that is out of reach all day ends the argument, and lunch becomes a time when students talk to each other." },
      { label: "B", text: "No. Parents need to be able to reach their children, above all in an emergency, and students will not learn to control their own attention if the school does it for them." },
      { label: "C", text: "Lock phones away during class and allow them at lunch and between classes. That protects teaching time without cutting students off from their families." },
      { label: "D", text: "Let each teacher set the rule for their own room. A photography class and a calculus class have different needs." },
    ],
  },
  {
    id: "w-bodycam",
    area: "Law and courts",
    title: "Body camera footage",
    context: "Police in the city of Marsden wear body cameras, but footage of an incident is released only after the internal investigation ends, which often takes more than a year. A proposed ordinance would require the department to release the footage within fourteen days whenever an officer uses force that causes serious injury.",
    issue: "Should Marsden require body camera footage of serious uses of force to be released within fourteen days?",
    perspectives: [
      { label: "A", text: "Yes. The public paid for the cameras so that it could see what happened. A year of silence breeds rumor, and trust is lost long before the investigation ends." },
      { label: "B", text: "No. Early release can shape what witnesses think they remember and what future jurors believe, and a single camera angle can mislead. Release the footage when the investigation is complete." },
      { label: "C", text: "Show the footage to the injured person or their family and lawyer within fourteen days, and to the public when the investigation ends." },
      { label: "D", text: "Have an independent review board decide within thirty days, case by case, whether release would harm the investigation." },
    ],
  },
  {
    id: "w-noncompete",
    area: "Work",
    title: "Noncompete agreements",
    context: "About one worker in five in the state of Verrin has signed an agreement not to work for a competing business for a year or more after leaving a job. The agreements were once limited to executives and engineers; they now appear in contracts for warehouse staff and restaurant workers. The legislature is considering a bill that would make all such agreements unenforceable.",
    issue: "Should Verrin ban noncompete agreements for all workers?",
    perspectives: [
      { label: "A", text: "Yes. The agreements hold down wages and keep people in jobs they would otherwise leave. Trade secrets are already protected by other laws, so the agreements add little except control over workers." },
      { label: "B", text: "No. Firms invest in training and in client relationships, and they will invest less if an employee can carry both across the street the next day. Adults should be free to sign the contracts they choose." },
      { label: "C", text: "Ban the agreements for anyone earning less than twice the state's median wage, and keep them for senior employees who can bargain over the terms." },
      { label: "D", text: "Allow the agreements, but require the former employer to pay half the worker's salary for as long as the restriction lasts." },
    ],
  },
  {
    id: "w-museum-returns",
    area: "Culture",
    title: "A museum collection",
    context: "The Aldane Museum holds about two hundred carved objects made by the Tavari people, bought from a dealer in 1908 in a sale that was legal at the time. The gallery that displays them is the museum's most visited. A council representing Tavari descendants has asked for the objects to be returned.",
    issue: "Should the Aldane Museum return the Tavari collection?",
    perspectives: [
      { label: "A", text: "Yes. The objects were sold at a time when the Tavari had little power to refuse, and they matter more to the people who made them than to any visitor. A legal sale is not the same as a fair one." },
      { label: "B", text: "No. The museum bought the objects lawfully, has preserved them for more than a century, and shows them to half a million people a year. Returning them would invite a claim on every collection in the building." },
      { label: "C", text: "Transfer ownership to the Tavari council and keep most of the objects at the museum on long-term loan, with the council deciding how they are displayed and described." },
      { label: "D", text: "Return the objects that had ceremonial use and keep the everyday ones, since the two kinds of object do not carry the same meaning." },
    ],
  },
  {
    id: "w-drought-water",
    area: "Environment",
    title: "Water in a drought",
    context: "The city of Kestrel Valley is in the third year of a drought, and its reservoir is at forty percent of capacity. The water board must cut household use by a fifth. It is choosing between two methods: a price that rises steeply with the amount a household uses, or a fixed monthly limit for every household with penalties for exceeding it.",
    issue: "Should Kestrel Valley cut water use with steeply rising prices instead of fixed household limits?",
    perspectives: [
      { label: "A", text: "Yes. With prices, each household decides which uses to give up, and the heaviest users pay the most. The extra revenue can repair the leaking mains that waste water every day." },
      { label: "B", text: "No. Prices let wealthy households keep their lawns while others cut back on washing. A limit that is the same for every household, with an allowance for each person in it, treats water as something everyone needs." },
      { label: "C", text: "Use prices, but give every person a basic amount at a low rate before the steep prices begin." },
      { label: "D", text: "Begin with the largest users. Golf courses, car washes and commercial landscaping should be cut before any household is asked to change." },
    ],
  },
  {
    id: "w-local-news",
    area: "Media",
    title: "Public money for local news",
    context: "The only newspaper in the town of Grafton has announced that it will close at the end of the year. Its two reporters are the only journalists who regularly attend meetings of the town council and the school board. The council is considering an annual grant of $300,000 to keep the paper's local reporting going.",
    issue: "Should Grafton pay to keep its local newspaper reporting?",
    perspectives: [
      { label: "A", text: "Yes. When no reporter is in the room, no one outside the council knows how public money is spent. The town already pays for a library and public records; reporting is part of the same public service." },
      { label: "B", text: "No. A newspaper that the council pays for cannot be trusted to criticize the council, and taxpayers should not be made to rescue a business that readers stopped supporting." },
      { label: "C", text: "Fund it through an independent board, with the amount fixed by formula for five years, so that the council cannot cut the grant in response to coverage it dislikes." },
      { label: "D", text: "Give every household a voucher it can assign to any local news outlet, new or old, and let residents decide who earns the money." },
    ],
  },
  {
    id: "w-court-cameras",
    area: "Law and courts",
    title: "Cameras in court",
    context: "Trial courts in the state of Elsmere do not allow video cameras. Courtrooms are open to the public, but most hold fewer than fifty spectators. A bill before the legislature would require criminal trials to be streamed live online.",
    issue: "Should Elsmere stream its criminal trials online?",
    perspectives: [
      { label: "A", text: "Yes. Trials are public by right, and a right that only fifty people can use is hardly public. People who watch real trials understand and trust the courts better than people who know them from television drama." },
      { label: "B", text: "No. Witnesses and jurors behave differently when they know they are being broadcast, short clips distort long trials, and a defendant who is acquitted remains on the internet for good." },
      { label: "C", text: "Allow streaming only when the defendant consents, with the judge able to switch the cameras off for any witness who asks." },
      { label: "D", text: "Stream appeals and sentencing hearings, where no witnesses testify, and keep cameras out of trials." },
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
