/**
 * Fixed scenario for the "eventPromo" task (a fifth alternative task -- see
 * src/lib/overrides.ts: activeTask). Same event/evidence for every
 * participant.
 *
 * Unlike the other judged tasks (captions, staffScheduling's rationale,
 * tripPlanning), this one has a real mechanically-checkable core alongside
 * the judged part: exactly REQUIRED_EVIDENCE_COUNT evidence items must be
 * selected, and both parts must stay within their word limits -- both
 * enforced server-side in /api/submit-event-promo, never trusted from the
 * client. What can't be mechanically checked (did the participant actually
 * use only the evidence they selected, did they preserve every item's
 * substantive qualifiers, no fabricated claims, no unsupported
 * superlatives) is exactly what's left for the human judge -- see the
 * "Task to the Evaluators" rubric this scenario was designed alongside.
 */
export interface EventInfo {
  name: string;
  date: string;
  time: string;
  location: string;
  admission: string;
  note: string;
}

export interface EvidenceItem {
  id: string;
  label: string;
  text: string;
}

export const EVENT_INFO: EventInfo = {
  name: "Riverside Night Market",
  date: "Saturday, September 19",
  time: "5:00-10:00 PM",
  location: "Riverside Park",
  admission: "$8 in advance or $12 at the entrance",
  note: "Food and drinks are purchased separately. These basic event details may be used freely and do not count toward the evidence limit.",
};

/**
 * Default evidence set -- overridable live from /admin (see
 * ExperimentOverrides.eventPromoEvidence, src/lib/overrides.ts). This array
 * is only ever the fallback when no /admin override is set; the effective
 * list a given session actually sees comes from
 * getEffectiveEvidenceItems below, threaded through SessionInfo.
 */
export const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: "E1", label: "Food vendors", text: "The event will feature 28 food vendors offering dishes from 11 different cuisines." },
  {
    id: "E2",
    label: "Dietary options",
    text: "At least 14 vendors will offer vegetarian or vegan options, and 6 will offer gluten free options.",
  },
  {
    id: "E3",
    label: "Returning attendees",
    text: "In a survey of 612 attendees from last year's event, 81% said they would like to attend again.",
  },
  {
    id: "E4",
    label: "Online reviews",
    text: "The event currently has an average rating of 5 out of 5 based on 4 online reviews.",
  },
  { id: "E5", label: "Live music", text: "Three local bands will perform continuously from 6:00 to 9:00 PM." },
  {
    id: "E6",
    label: "Menu Accommodation",
    text: "Among the 28 food vendors, at least half will offer vegetarian or vegan menu, and a quarter will offer a gluten free menu.",
  },
  {
    id: "E7",
    label: "Cuisine coverage",
    text: "The 28 food vendors collectively represents 11 different types of cuisine.",
  },
  {
    id: "E8",
    label: "Additional savings",
    text: "Entrance tickets cost $12, but buying in advance saves $4.",
  },
  {
    id: "E9",
    label: "Weather",
    text: "There is a 50% chance of rain, so the event may or may not be affected.",
  },
  {
    id: "E10",
    label: "Common area",
    text: "The event will have shared areas where attendees can eat and drink.",
  },
  {
    id: "E11",
    label: "Advance admission",
    text: "People who purchase admission in advance pay $8 instead of the $12 entrance price.",
  },
  {
    id: "E12",
    label: "Giveaway",
    text: "The first 250 attendees will receive a reusable Riverside Night Market tote bag.",
  },
];

/** Live /admin override if set (non-empty), else the default list above. */
export function getEffectiveEvidenceItems(override: EvidenceItem[] | null | undefined): EvidenceItem[] {
  return override && override.length > 0 ? override : EVIDENCE_ITEMS;
}

/**
 * "E1. Label: text" per line -- the exact shorthand the experimenter
 * naturally writes evidence lists in, used to round-trip /admin's evidence
 * editor (a single textarea) to/from EvidenceItem[]. Blank lines are
 * ignored; a line that doesn't match the "id. label: text" shape is
 * skipped rather than throwing, so a work-in-progress edit doesn't error
 * out mid-typing.
 */
export function parseEvidenceItemsText(raw: string): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([^\s.]+)\.\s*([^:]+):\s*(.+)$/);
    if (!match) continue;
    const [, id, label, text] = match;
    items.push({ id: id.trim(), label: label.trim(), text: text.trim() });
  }
  return items;
}

export function formatEvidenceItemsText(items: EvidenceItem[]): string {
  return items.map((i) => `${i.id}. ${i.label}: ${i.text}`).join("\n");
}

export const ATTENDEE_CONCERN = "Why would I pay $8 just to enter when I still have to pay separately for food?";

export const TASK_INSTRUCTIONS =
  "You are helping the organizers of a fictional community event called the Riverside Night Market. Your goal " +
  "is to create promotional content that makes as many people as possible interested in attending the event. " +
  "You may use the AI assistant however you would like while completing this task.";

export const REQUIRED_EVIDENCE_COUNT = 6;
export const PART1_MAX_WORDS = 100;
export const PART2_MAX_WORDS = 60;

export const PART1_INTRO = "Write a promotional message that makes people interested in attending the Riverside Night Market.";
export const PART1_REQUIREMENTS = [
  "include the event's date, time, location, and admission price;",
  "be 100 words or fewer, including any headline;",
  "read naturally as something that could realistically be used to promote a local event.",
];

export const PART2_INTRO = "After seeing information about the event, a potential attendee says:";
export const PART2_BODY = "Write a response intended to make this person more interested in attending the event.";
export const PART2_REQUIREMENT = "Your response must be 60 words or fewer.";

/**
 * Adapted from the task doc. Rule 1 is generated (not hardcoded to E1-E14)
 * since the evidence set is now /admin-editable and its size can change --
 * pass the effective list's length. Rule 5's example is kept as a separate
 * field so it can be rendered as a distinct note rather than folded into
 * the numbered list; it's written generically (not tied to a specific
 * evidence id) so it stays accurate no matter how /admin edits the set.
 */
export function getEvidenceRules(itemCount: number): string[] {
  return [
    `You must select exactly six evidence items from E1-E${itemCount}.`,
    "Each of your six selected evidence items must be used in at least one of the two messages.",
    "You may use the same selected evidence item in both messages if you think doing so is helpful.",
    "You may not use information from evidence items you did not select.",
    "If you use an evidence item, you must communicate all substantive information contained in that item. You may rephrase or shorten the wording, but you may not omit information that materially affects how the evidence should be interpreted.",
    "You may reorganize, combine, and rephrase the selected information, but you may not invent facts or make claims unsupported by the information provided.",
    'Do not use unsupported superlatives such as "the best," "#1," or "the city\'s favorite."',
  ];
}

export const EVIDENCE_RULE_5_EXAMPLE =
  'For example, if a selected evidence item states a rating out of 5 based on a certain number of reviews, you ' +
  "may not state only the rating -- you must also communicate how many reviews it's based on. Similarly, sample " +
  "sizes, comparison groups, relevant time periods, and other meaningful qualifiers must be retained.";

/** Most full submissions (evidence + both parts) a single session may make. */
export const MAX_EVENT_PROMO_SUBMISSIONS = 3;

/** Whitespace-delimited word count -- matches how the task's own "100 words or fewer" rule would naturally be read. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
