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

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: "E1", label: "Food vendors", text: "The event will have 28 food vendors representing 11 different cuisines." },
  {
    id: "E2",
    label: "Local businesses",
    text: "19 of the 28 food vendors are independently owned businesses located within 20 miles of the event.",
  },
  {
    id: "E3",
    label: "Dietary options",
    text: "14 vendors will offer at least one vegetarian option, 8 will offer a vegan option, and 6 will offer a gluten-free option.",
  },
  {
    id: "E4",
    label: "Food prices",
    text: "Based on vendor menus, the average price of a full-sized food item is approximately $9.40.",
  },
  {
    id: "E5",
    label: "Returning attendees",
    text: "In a survey of 612 attendees from last year's event, 81% said they would like to attend again.",
  },
  {
    id: "E6",
    label: "Online reviews",
    text: "The event currently has an average rating of 4.9 out of 5 based on 37 online reviews.",
  },
  { id: "E7", label: "Live music", text: "Three local bands will perform continuously from 6:00-9:00 PM." },
  {
    id: "E8",
    label: "Chef demonstrations",
    text: "Local chefs will give 15-minute cooking demonstrations at 6:00, 7:00, and 8:00 PM.",
  },
  {
    id: "E9",
    label: "Transportation",
    text: "A free shuttle will run between downtown and Riverside Park every 20 minutes from 4:30-10:30 PM.",
  },
  {
    id: "E10",
    label: "Parking",
    text: "Approximately 120 parking spaces are available at Riverside Park. Organizers expect more than 1,000 attendees.",
  },
  {
    id: "E11",
    label: "Weather preparation",
    text: "The event will take place rain or shine. Approximately 70% of the main food and seating area will be covered by tents.",
  },
  { id: "E12", label: "Seating", text: "The event will have approximately 180 seats available in common seating areas." },
  {
    id: "E13",
    label: "Advance admission",
    text: "People who purchase admission in advance pay $8 instead of the $12 entrance price.",
  },
  {
    id: "E14",
    label: "Giveaway",
    text: "The first 250 attendees will receive a reusable Riverside Night Market tote bag.",
  },
];

export const ATTENDEE_CONCERN = "Why would I pay $8 just to enter when I still have to pay separately for food?";

export const REQUIRED_EVIDENCE_COUNT = 6;
export const PART1_MAX_WORDS = 100;
export const PART2_MAX_WORDS = 60;

/** Most full submissions (evidence + both parts) a single session may make. */
export const MAX_EVENT_PROMO_SUBMISSIONS = 3;

/** Whitespace-delimited word count -- matches how the task's own "100 words or fewer" rule would naturally be read. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
