import type { WritingPrompt } from "@/components/writing/outline-builder";

/**
 * Original Argumentative Writing prompts in the current LSAT format: a
 * debatable issue, a short context, and three or four perspectives. The
 * student takes a position and engages at least one other perspective.
 * 15 minutes prewriting (guided analysis), 35 minutes writing.
 */
export const WRITING_PROMPTS: (WritingPrompt & { id: string })[] = [
  {
    id: "w-municipal-broadband",
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
];

export function pickPrompt(exclude: string[] = []) {
  const pool = WRITING_PROMPTS.filter((p) => !exclude.includes(p.id));
  const list = pool.length ? pool : WRITING_PROMPTS;
  return list[Math.floor(Math.random() * list.length)];
}

export const PREWRITE_SEC = 15 * 60;
export const WRITE_SEC = 35 * 60;
