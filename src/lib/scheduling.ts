/**
 * Fixed 6-speaker / 6-slot scheduling puzzle used for the "scheduling" task
 * (an alternative to the cartoon caption task, toggled from /admin -- see
 * src/lib/overrides.ts: activeTask). Same speaker order, slots, and
 * constraints for every participant; unlike the caption task there's no
 * per-session randomization here.
 *
 * Chosen by brute-force search over all 720 permutations of 6 speakers so
 * that exactly one ordering satisfies all 12 constraints -- verified via a
 * throwaway script before committing, not just asserted. That means a
 * submitted schedule's correctness is checked by evaluating each
 * constraint's actual predicate against the submission, not by comparing
 * to a stored "answer key" -- a schedule other than the intended one that
 * happened to satisfy every constraint would also be marked fully correct.
 */
export interface Speaker {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: number;
  label: string;
}

export interface SchedulingConstraint {
  id: number;
  text: string;
  check: (order: string[]) => boolean;
}

export interface DistractorNote {
  id: number;
  text: string;
}

export const SPEAKERS: Speaker[] = [
  { id: "amara", name: "Dr. Amara Chen" },
  { id: "liam", name: "Prof. Liam Osei" },
  { id: "priya", name: "Dr. Priya Nair" },
  { id: "marcus", name: "Dr. Marcus Webb" },
  { id: "sofia", name: "Prof. Sofia Ruiz" },
  { id: "tomas", name: "Dr. Tomás Alves" },
];

export const TIME_SLOTS: TimeSlot[] = [
  { id: 1, label: "9:00 AM" },
  { id: 2, label: "10:00 AM" },
  { id: 3, label: "11:00 AM" },
  { id: 4, label: "1:00 PM" },
  { id: 5, label: "2:00 PM" },
  { id: 6, label: "3:00 PM" },
];

/** 1-indexed slot position of a speaker within a submitted order (array of speaker ids, slot 1 first). Returns -1 if absent. */
function pos(order: string[], speakerId: string): number {
  const i = order.indexOf(speakerId);
  return i === -1 ? -1 : i + 1;
}

export const SCHEDULING_CONSTRAINTS: SchedulingConstraint[] = [
  { id: 1, text: "Dr. Amara Chen must present before Dr. Marcus Webb.", check: (o) => pos(o, "amara") < pos(o, "marcus") },
  { id: 2, text: "Prof. Liam Osei must present before Prof. Sofia Ruiz.", check: (o) => pos(o, "liam") < pos(o, "sofia") },
  {
    id: 3,
    text: "Dr. Priya Nair must present immediately after Dr. Amara Chen.",
    check: (o) => pos(o, "priya") === pos(o, "amara") + 1,
  },
  {
    id: 4,
    text: "Prof. Sofia Ruiz and Dr. Tomás Alves cannot present in adjacent slots.",
    check: (o) => Math.abs(pos(o, "sofia") - pos(o, "tomas")) !== 1,
  },
  { id: 5, text: "Dr. Marcus Webb must present in the afternoon (1:00 PM or later).", check: (o) => pos(o, "marcus") >= 4 },
  {
    id: 6,
    text: "Dr. Tomás Alves cannot present in the first or last slot.",
    check: (o) => pos(o, "tomas") !== 1 && pos(o, "tomas") !== 6,
  },
  { id: 7, text: "Dr. Amara Chen cannot present in the last slot.", check: (o) => pos(o, "amara") !== 6 },
  { id: 8, text: "Dr. Priya Nair must present before 2:00 PM (slot 5).", check: (o) => pos(o, "priya") < 5 },
  { id: 9, text: "Prof. Sofia Ruiz must present in the morning (before 1:00 PM).", check: (o) => pos(o, "sofia") <= 3 },
  { id: 10, text: "Prof. Liam Osei must present before Dr. Marcus Webb.", check: (o) => pos(o, "liam") < pos(o, "marcus") },
  { id: 11, text: "Dr. Tomás Alves must present after Dr. Priya Nair.", check: (o) => pos(o, "tomas") > pos(o, "priya") },
  { id: 12, text: "Dr. Amara Chen must present in the morning (before 1:00 PM).", check: (o) => pos(o, "amara") <= 3 },
];

/**
 * Plausible-sounding but load-bearing-nothing facts, mixed into the
 * displayed list alongside SCHEDULING_CONSTRAINTS via SCHEDULING_DISPLAY_ITEMS
 * below with no label distinguishing them -- checkSchedule() below never
 * reads this array, so these never affect correctness. The point is
 * deliberately not stated anywhere in the UI: telling which of the 15
 * displayed items are real constraints and which are noise is on the
 * participant (and whichever model they lean on) to work out themselves,
 * ideally by noticing none of these actually restricts any speaker's slot --
 * a naive "treat every line as a constraint" approach (from a person or a
 * model) risks either overconstraining the search or wasting effort
 * reasoning about irrelevant details.
 */
export const DISTRACTOR_NOTES: DistractorNote[] = [
  { id: 101, text: "Prof. Sofia Ruiz's talk is titled \"Resilient Networks at Scale.\"" },
  { id: 102, text: "The auditorium seats up to 300 attendees." },
  { id: 103, text: "This is the fourth consecutive year the speaker series has run in this format." },
];

export type SchedulingDisplayItem =
  | ({ kind: "constraint" } & SchedulingConstraint)
  | ({ kind: "note" } & DistractorNote);

/**
 * Real constraints and distractor notes interleaved into one fixed display
 * order -- not grouped by type or otherwise visually distinguishable, so the
 * UI can render a single flat list. Positions for the 3 notes were chosen by
 * hand to avoid an obvious cluster at the start or end.
 */
export const SCHEDULING_DISPLAY_ITEMS: SchedulingDisplayItem[] = (() => {
  const items: SchedulingDisplayItem[] = SCHEDULING_CONSTRAINTS.map((c) => ({ kind: "constraint", ...c }));
  const notes = DISTRACTOR_NOTES.map((n) => ({ kind: "note" as const, ...n }));
  const withNotes = [...items];
  withNotes.splice(3, 0, notes[0]);
  withNotes.splice(8, 0, notes[1]);
  withNotes.splice(13, 0, notes[2]);
  return withNotes;
})();

export interface ScheduleCheckResult {
  id: number;
  text: string;
  satisfied: boolean;
}

/**
 * Evaluates a submitted order (array of 6 speaker ids, slot 1 first)
 * against every constraint. Throws if the order isn't a permutation of all
 * six speaker ids -- callers should validate that separately if they want
 * a friendlier error than a thrown exception.
 */
export function checkSchedule(order: string[]): { results: ScheduleCheckResult[]; allCorrect: boolean } {
  const validIds = new Set(SPEAKERS.map((s) => s.id));
  const isPermutation =
    order.length === SPEAKERS.length &&
    order.every((id) => validIds.has(id)) &&
    new Set(order).size === SPEAKERS.length;
  if (!isPermutation) {
    throw new Error("Schedule must include each speaker exactly once");
  }

  const results = SCHEDULING_CONSTRAINTS.map((c) => ({ id: c.id, text: c.text, satisfied: c.check(order) }));
  return { results, allCorrect: results.every((r) => r.satisfied) };
}
