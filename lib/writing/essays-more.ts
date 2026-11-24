/**
 * More model essays for the Argumentative Writing guide. Each strong essay
 * shows a different way to build a position: arguing against the proposal,
 * a yes with conditions, and stating a test before applying it. One
 * "competent" essay sits between weak and strong to show what the last step
 * up consists of. All essays and prompts are original.
 */
import type { ModelEssay } from "./guide";

export const MORE_ESSAYS: ModelEssay[] = [
  {
    id: "attendance-strong",
    promptId: "w-attendance",
    label: "Strong essay: arguing against the proposal",
    quality: "strong",
    approach: "Says no, shows that the evidence does not support the proposal, and offers something better in its place.",
    paragraphs: [
      {
        role: "Introduction: a clear no, and what to do instead",
        text: "Brightwater should not make lecture attendance mandatory. The failure rate among first-year students is a real problem, but a card swipe addresses the wrong part of it: it records where a student is, not whether the student is learning. The university should instead add a short graded quiz each week to its first-year lecture courses, which would reach the same struggling students that Perspective C worries about without grading anyone on presence.",
        notes: [
          { quote: "Brightwater should not make lecture attendance mandatory", note: "A no is a complete position, as long as it is stated this plainly. Eight words, first sentence." },
          { quote: "The failure rate among first-year students is a real problem", note: "The writer accepts the problem before rejecting the solution. An essay that denied the problem would look careless." },
          { quote: "it records where a student is, not whether the student is learning", note: "The whole argument in one contrast. Both body paragraphs grow out of this sentence." },
          { quote: "The university should instead add a short graded quiz each week", note: "The most important move in a “no” essay: say what should happen instead. Without it, the essay only complains." },
        ],
      },
      {
        role: "Reason 1: the evidence does not show what the proposal needs",
        text: "The first reason is that the senate's own figures do not show that requiring attendance would reduce failure. Students who miss a third of their lectures fail more often, but the students who skip are not otherwise the same as those who attend. Many have stopped keeping up with the reading, are working long hours, or have already decided the course is lost. Absence is often a sign of those troubles, not their cause. A penalty can put such a student back in a seat. It cannot make the student listen, and a student who is scrolling in the back row will fail the final examination just as surely as one who stayed home.",
        notes: [
          { quote: "the senate's own figures do not show that requiring attendance would reduce failure", note: "The essay takes the other side's best evidence and tests it. This is the Logical Reasoning skill of separating a correlation from a cause, used in an essay." },
          { quote: "are not otherwise the same as those who attend", note: "The alternative explanation, stated simply. No technical vocabulary is needed to make the point." },
          { quote: "Absence is often a sign of those troubles, not their cause", note: "“Often”, not “always”. The claim is exactly as strong as the writer can defend." },
          { quote: "scrolling in the back row", note: "One concrete picture makes the abstract point stick: a seat filled is not a lecture heard." },
        ],
      },
      {
        role: "Reason 2: what a grade is for",
        text: "The second reason is that an attendance penalty changes what a Brightwater grade means. A transcript tells employers and graduate schools how well a student mastered a subject. Under the proposal, a student who earns an A on every examination but works a morning shift and watches the recordings at night would receive a lower grade than a classmate who learned less and attended more. That result is unfair to the first student, and it makes every grade the university issues a little less informative. The cost would fall hardest on students who commute or hold jobs, who have the least control over their weekday hours.",
        notes: [
          { quote: "changes what a Brightwater grade means", note: "A second reason of a different kind. The first was about evidence; this one is about principle. Either could stand without the other." },
          { quote: "works a morning shift and watches the recordings at night", note: "A specific student the reader can picture. The example does the persuading; the sentence after it only names the result." },
          { quote: "makes every grade the university issues a little less informative", note: "The harm is widened from one student to the institution, in measured words: “a little less”, not “meaningless”." },
        ],
      },
      {
        role: "Objection and reply: concede the duty, redirect it",
        text: "Perspective A raises the strongest objection: first-year students often do not see the cost of falling behind until it is too late, and the university has a duty to step in. That is right, and it is why doing nothing is not an answer. But the duty is to catch students who are not learning, and a weekly quiz does that directly. A student who misses two quizzes or fails them can be referred to an adviser in the third week of term, whether or not the student has been in the room. Perspective D would leave attendance rules to each instructor, which is better than a single rule for every course. Still, two students in different sections of the same course should not be graded by different standards because of where they happened to register.",
        notes: [
          { quote: "That is right, and it is why doing nothing is not an answer", note: "A full concession. The writer agrees with the objection's premise and uses it to rule out the lazy version of their own side." },
          { quote: "the duty is to catch students who are not learning", note: "The turn. The essay accepts the duty and then shows that its own plan meets that duty better than the proposal does." },
          { quote: "in the third week of term", note: "A detail that shows the alternative has been thought through. It also makes the plan sound workable." },
          { quote: "Perspective D would leave attendance rules to each instructor, which is better", note: "A second perspective, handled in two sentences: what it gets right, then the one thing wrong with it." },
        ],
      },
      {
        role: "Close: the choice in one line",
        text: "Brightwater's goal is fewer failing first-year students, and it should adopt the measure that tests for learning instead of the one that counts seats.",
        notes: [
          { quote: "tests for learning instead of the one that counts seats", note: "The close repeats the contrast from the introduction in new words. About 450 words in all." },
        ],
      },
    ],
    takeaways: [
      "A “no” essay needs an “instead”. Rejecting the proposal is half a position.",
      "Accept the problem, then show the proposed fix does not reach it.",
      "Test the other side's evidence the way a Logical Reasoning question would.",
      "Two reasons of different kinds, one practical and one principled, are stronger than two of the same kind.",
    ],
  },
  {
    id: "attendance-ok",
    promptId: "w-attendance",
    label: "Competent essay on the same prompt: what holds it back",
    quality: "ok",
    approach: "Clear and organized, and it would not hurt an application. The notes show what separates it from the strong essay on the same prompt.",
    paragraphs: [
      {
        role: "Introduction: a clear thesis, then filler",
        text: "Brightwater should require attendance in first-year lecture courses. This would help new students succeed and would be fair to older students who have already learned to manage their time. Although some people argue that students are adults, the benefits of the policy outweigh the costs.",
        notes: [
          { quote: "Brightwater should require attendance in first-year lecture courses", note: "This part is right. The thesis comes first and it is specific. Many essays never get this far." },
          { quote: "the benefits of the policy outweigh the costs", note: "A sentence that fits any position on any topic. Replace it with the two reasons the essay is about to give." },
        ],
      },
      {
        role: "Reason 1: a fact with no explanation",
        text: "First, attendance improves performance. The senate found that first-year students who miss more than a third of their lectures fail at three times the rate of those who attend. This shows that going to class is important. If students are required to attend, they will learn more and fewer of them will fail.",
        notes: [
          { quote: "The senate found that", note: "Using the prompt's own figure is a good instinct." },
          { quote: "This shows that going to class is important", note: "The gap. The figure shows that skipping and failing go together, not that forcing attendance will fix failure. The strong essay on this prompt is built on exactly this weakness." },
          { quote: "they will learn more and fewer of them will fail", note: "The claim is repeated, not supported. One sentence saying how attendance helps, such as hearing what the lecturer stresses before the examination, would turn it into an argument." },
        ],
      },
      {
        role: "Reason 2: a real reason, kept general",
        text: "Second, first-year students need more structure than other students. Many of them are living away from home for the first time and have trouble managing their schedules. A requirement would help them build good habits that will benefit them in later years, when the requirement no longer applies.",
        notes: [
          { quote: "first-year students need more structure than other students", note: "A second, separate reason, and a sensible one. The structure of the essay is sound." },
          { quote: "have trouble managing their schedules", note: "True, but general. One picture, such as a nine o'clock lecture that nobody notices you missed, would do more than three general sentences." },
        ],
      },
      {
        role: "Objection: named, then waved away",
        text: "Some people, like Perspective B, say that students are adults and should make their own choices. However, the university has a responsibility to help its students, so this argument is not convincing.",
        notes: [
          { quote: "say that students are adults and should make their own choices", note: "The essay answers the weakest part of Perspective B. Its stronger point, that a grade should measure learning and not presence, is never mentioned." },
          { quote: "so this argument is not convincing", note: "The biggest gap between this essay and a strong one. There is no concession and no reason, only a verdict. A reader has to take the writer's word for it." },
        ],
      },
      {
        role: "Conclusion: a restatement",
        text: "In conclusion, Brightwater should require attendance in first-year lecture courses because it improves performance and gives new students structure. For these reasons the senate should adopt Perspective C.",
        notes: [
          { quote: "In conclusion", note: "Nothing wrong, and nothing gained. The conclusion repeats the introduction. About 210 words in all, which leaves most of the 35 minutes unused." },
        ],
      },
    ],
    takeaways: [
      "It has a position, two reasons and an order. That already beats the weak essay.",
      "Each reason is stated and then restated. Neither is explained.",
      "The objection gets one sentence and no concession.",
      "The gap to strong is in the plan, not the prose: a “because” under each reason and a real reply to the best objection.",
    ],
  },
  {
    id: "practitioners-strong",
    promptId: "w-legal-practitioners",
    label: "Strong essay: a yes with conditions",
    quality: "strong",
    approach: "Supports the proposal on two stated conditions, each chosen to answer the best objection in advance.",
    paragraphs: [
      {
        role: "Introduction: thesis with its conditions",
        text: "Carrow should license trained non-lawyers to represent tenants in eviction cases, on two conditions: every practitioner must carry malpractice insurance, and any case that raises a counterclaim or a housing subsidy must be referred to a lawyer. Nine out of ten tenants now face a represented landlord alone, so the practical choice for most of them is between a practitioner and no one. Perspective B is right that poor advice can cost a family its home, and the two conditions are designed to answer that risk.",
        notes: [
          { quote: "on two conditions", note: "A conditional position is still a commitment. The essay says yes, and says exactly what the yes depends on." },
          { quote: "every practitioner must carry malpractice insurance", note: "The conditions are specific enough to be put in a rule. “With proper safeguards” would have said nothing." },
          { quote: "between a practitioner and no one", note: "The frame for the whole essay: what the real alternative is. It comes straight from the prompt's nine-in-ten figure." },
          { quote: "the two conditions are designed to answer that risk", note: "The introduction tells the reader that the conditions and the objection are connected. The essay is planned, and it shows." },
        ],
      },
      {
        role: "Reason 1: compare with the real alternative",
        text: "The main reason to adopt the rule is that it measures the practitioners against the right alternative. Opponents compare a practitioner with a lawyer, but the tenants this rule would serve do not have lawyers and will not get them. A tenant alone must answer papers she has never seen before, across the room from someone who files them every week. A person who has spent a year studying notice requirements, payment records and repair defenses can tell her which defense applies and say so to the judge. That help is narrower than a lawyer's, but most eviction cases turn on a small number of recurring questions.",
        notes: [
          { quote: "it measures the practitioners against the right alternative", note: "The topic sentence names the reasoning, not only the conclusion. Choosing the right comparison is a move lawyers make constantly." },
          { quote: "do not have lawyers and will not get them", note: "Short and flat. The sentence does not soften a fact the prompt has already established." },
          { quote: "across the room from someone who files them every week", note: "The imbalance is shown in one image, without adjectives." },
          { quote: "That help is narrower than a lawyer's", note: "A concession inside the writer's own reason. Admitting the limit makes the claim that follows easier to believe." },
        ],
      },
      {
        role: "Reason 2: the conditions put the risk where it can be managed",
        text: "The second reason is that the conditions put the risk where it can be managed. Insurance means a tenant harmed by bad advice has a claim against someone able to pay, which is more than a tenant who lost alone has today. The referral rule sends the complicated cases, where a missed issue is most likely, to the legal aid lawyers the state already funds. Those lawyers are too few to take every case, but they are enough to take the hard ones if practitioners handle the routine ones. The rule would therefore make better use of the lawyers Carrow has, in addition to adding new help.",
        notes: [
          { quote: "the conditions put the risk where it can be managed", note: "The second reason explains the conditions from the thesis. Nothing promised in the introduction is left hanging." },
          { quote: "which is more than a tenant who lost alone has today", note: "Each condition is tied back to the comparison from paragraph two. The essay keeps using one frame." },
          { quote: "make better use of the lawyers Carrow has", note: "An unexpected benefit: the rule helps the existing system, which takes some of the force out of Perspective B before it is even named." },
        ],
      },
      {
        role: "Objection and reply: two perspectives, each given its due",
        text: "Perspective B raises the most serious objection: a one-year course cannot cover every trap, and the state would be building a lesser service for people who cannot pay. Both points have force. A lawyer for every tenant would be better, and if the legislature were prepared to pay for that, this rule would be unnecessary. But legal aid would have to grow many times over to reach nine tenants in ten, and the families in court next month cannot wait for a budget that may never pass. Perspective C would let practitioners prepare papers but not speak. That stops the help at the courtroom door, which is where an unrepresented tenant facing a lawyer most needs it.",
        notes: [
          { quote: "Both points have force", note: "Four words of honest concession. They cost the writer nothing and buy a great deal of credibility." },
          { quote: "if the legislature were prepared to pay for that, this rule would be unnecessary", note: "The writer states the condition under which the other side would be right. That is a sign of a confident argument." },
          { quote: "cannot wait for a budget that may never pass", note: "The reply: the better option is not actually on offer. The objection is answered without being belittled." },
          { quote: "stops the help at the courtroom door", note: "Perspective C is answered in two sentences with one clear image." },
        ],
      },
      {
        role: "Close: the plan in one sentence",
        text: "With insurance and a referral rule in place, Carrow can give most tenants trained help now and keep its lawyers for the cases that need them.",
        notes: [
          { quote: "trained help now and keep its lawyers for the cases that need them", note: "Both reasons, compressed into one closing line. About 445 words in all." },
        ],
      },
    ],
    takeaways: [
      "“Yes, if” is a strong position when the conditions are specific.",
      "Choose conditions that answer the best objection, and say so in the introduction.",
      "Ask what the real alternative is. Here it is no help at all, not a lawyer.",
      "State when the other side would be right. It shows you understand the question.",
    ],
  },
  {
    id: "cameras-strong",
    promptId: "w-speed-cameras",
    label: "Strong essay: stating a test, then applying it",
    quality: "strong",
    approach: "Sets out a standard for judging every option in the introduction, then measures each perspective against it.",
    paragraphs: [
      {
        role: "Introduction: thesis and the test",
        text: "Lakemont should install the school-zone cameras, send a warning instead of a ticket for each driver's first violation, and spend the fine revenue only on rebuilding the streets around the same schools. The right test for any proposal here is simple: which one slows the most cars near the most schools soonest, without giving the city a reason to want more violations? Cameras with those two limits pass that test, and the alternatives each fail one part of it.",
        notes: [
          { quote: "Lakemont should install the school-zone cameras", note: "Thesis first, as always. The two limits that follow make the position the writer's own." },
          { quote: "The right test for any proposal here is simple", note: "The distinctive move of this essay. Before arguing, it says how the question should be judged. Legal writing does this all the time: the rule first, then the application." },
          { quote: "without giving the city a reason to want more violations", note: "The test has two parts, and the second part is taken from the opposing side's worry. The standard is fair to both sides." },
          { quote: "the alternatives each fail one part of it", note: "A map of the essay: the reader now expects each perspective to be measured against the test." },
        ],
      },
      {
        role: "The first half of the test: speed and coverage",
        text: "Take the first half of the test, slowing cars soon. Eleven children have been hit in three years, and police can watch each school zone only a few days a month. Drivers know that, and they drive accordingly. A camera is there every school day, and a driver who expects to be caught slows down whether or not a ticket ever arrives. Perspective D's speed humps and raised crosswalks would also work every day, and they need no enforcement at all. But rebuilding the streets around every school is a project of years and of budgets the council has not approved. Children are crossing those streets this month.",
        notes: [
          { quote: "Take the first half of the test", note: "The paragraph opens by saying which part of the standard it is applying. The reader never has to wonder where the essay is." },
          { quote: "Eleven children have been hit in three years", note: "The prompt's facts, used as the reason for urgency." },
          { quote: "and they need no enforcement at all", note: "A rival perspective is given its full strength inside a body paragraph. Engagement does not have to wait for paragraph four." },
          { quote: "Children are crossing those streets this month", note: "A short sentence at the end of a paragraph carries weight. It makes the timing point better than a long one would." },
        ],
      },
      {
        role: "The second half of the test: the city's incentive",
        text: "The second half of the test is the city's own incentive, and here the design matters more than the device. Perspective B is right that a city can come to depend on ticket money, and a council that depends on it has little reason to make the tickets stop. Restricting the revenue to street redesign near the schools where it was collected removes that temptation. Every dollar the cameras raise would go toward the humps and crosswalks that make the cameras less necessary. The program would then shrink as it succeeds, and Perspective D's plan would have a source of funds.",
        notes: [
          { quote: "the design matters more than the device", note: "A compact way of saying that the objection is to how cameras are used, not to cameras. It sets up the limit that follows." },
          { quote: "Perspective B is right that", note: "The concession is real: the essay agrees that revenue dependence is a danger, then designs around it." },
          { quote: "The program would then shrink as it succeeds", note: "The strongest sentence in the essay. It turns the opposing side's worry into a feature of the writer's plan." },
          { quote: "Perspective D's plan would have a source of funds", note: "A rival perspective is not defeated but absorbed. The essay shows how two of the options fit together." },
        ],
      },
      {
        role: "Objection and reply: fairness",
        text: "Perspective B also objects that a flat $75 fine is trivial for some families and a real hardship for others. That is true, and a warning for the first violation is the answer to most of it: no one pays for a single lapse, and a driver who is ticketed has already been told once. Perspective C would go further and scale fines to income. The aim is fair, but the city would have to collect income records from every ticketed driver, which adds exactly the kind of data gathering that Perspective B fears and delays the program while the system is built. The warning achieves most of the fairness at none of that cost.",
        notes: [
          { quote: "That is true, and a warning for the first violation is the answer to most of it", note: "“Most of it”, not “all of it”. The writer does not claim more than the plan delivers." },
          { quote: "The aim is fair, but", note: "Perspective C is credited for its goal before its method is questioned." },
          { quote: "adds exactly the kind of data gathering that Perspective B fears", note: "One perspective is used to answer another. This shows the writer has seen how the positions relate to each other, not only to the thesis." },
        ],
      },
      {
        role: "Close: back to the test",
        text: "Measured by how quickly it protects children and by whether the city profits from failure, cameras with first-time warnings and dedicated revenue are the best option Lakemont has.",
        notes: [
          { quote: "Measured by how quickly it protects children and by whether the city profits from failure", note: "The close restates the two-part test and the verdict in one sentence. About 430 words in all." },
        ],
      },
    ],
    takeaways: [
      "Say how the question should be judged before you judge it.",
      "Build the standard partly from the other side's concern, so it reads as fair.",
      "Organize the body by the parts of the test, and engage perspectives wherever they bear on it.",
      "The best reply to an objection is a design change that removes it.",
    ],
  },
];
