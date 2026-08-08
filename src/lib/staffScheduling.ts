/**
 * Fixed 6-staff / 6-shift weekly schedule used for the "staffScheduling" task
 * (a third alternative to the cartoon caption task and the speaker
 * scheduling puzzle -- see src/lib/overrides.ts: activeTask). Unlike the
 * speaker puzzle, this one is deliberately INFEASIBLE as given: no
 * assignment of the 6 staff to the 6 shifts satisfies all 8 constraints at
 * once (verified by brute force over all 720 permutations -- 0 solutions).
 *
 * The task isn't "find the answer" -- it's: notice it's unsolvable, work
 * out which single constraint is the actual structural blocker (only
 * dropping constraint id 1 makes it solvable; dropping any other single
 * constraint alone still leaves 0 solutions -- also brute-force verified),
 * write a rationale for why that's the right one to relax, and then produce
 * an assignment satisfying everything else. There's no single "correct"
 * final schedule (23 different assignments satisfy the remaining 7
 * constraints once #1 is dropped) -- the schedule, the dropped constraint,
 * and the rationale are logged together for a human judge to evaluate
 * later, not auto-graded pass/fail the way the speaker puzzle is.
 */
export interface StaffMember {
  id: string;
  name: string;
  keyholder: boolean;
}

export interface ShiftSlot {
  id: number;
  label: string;
}

export interface StaffConstraint {
  id: number;
  text: string;
  check: (order: string[]) => boolean;
}

export const STAFF: StaffMember[] = [
  { id: "jordan", name: "Jordan Reyes", keyholder: true },
  { id: "naomi", name: "Naomi Park", keyholder: true },
  { id: "aisha", name: "Aisha Bello", keyholder: false },
  { id: "diego", name: "Diego Cruz", keyholder: false },
  { id: "chen", name: "Chen Wu", keyholder: false },
  { id: "rosa", name: "Rosa Delgado", keyholder: false },
];

export const SHIFT_SLOTS: ShiftSlot[] = [
  { id: 1, label: "Monday -- Morning (opening)" },
  { id: 2, label: "Monday -- Evening (closing)" },
  { id: 3, label: "Wednesday -- Morning (opening)" },
  { id: 4, label: "Wednesday -- Evening (closing)" },
  { id: 5, label: "Saturday -- Morning (opening)" },
  { id: 6, label: "Saturday -- Evening (closing)" },
];

/** 1-indexed slot position of a staff member within a submitted order (array of staff ids, slot 1 first). Returns -1 if absent. */
function pos(order: string[], staffId: string): number {
  const i = order.indexOf(staffId);
  return i === -1 ? -1 : i + 1;
}

function isKeyholder(staffId: string): boolean {
  return STAFF.find((s) => s.id === staffId)?.keyholder ?? false;
}

export const STAFF_CONSTRAINTS: StaffConstraint[] = [
  {
    id: 1,
    text: "Every opening shift (Mon/Wed/Sat morning) must be staffed by a certified keyholder.",
    check: (o) => [1, 3, 5].every((slot) => isKeyholder(o[slot - 1])),
  },
  { id: 2, text: "Jordan Reyes cannot work Saturdays.", check: (o) => ![5, 6].includes(pos(o, "jordan")) },
  { id: 3, text: "Chen Wu is only available for evening shifts.", check: (o) => [2, 4, 6].includes(pos(o, "chen")) },
  { id: 4, text: "Rosa Delgado is only available for morning shifts.", check: (o) => [1, 3, 5].includes(pos(o, "rosa")) },
  {
    id: 5,
    text: "Diego Cruz and Chen Wu cannot both work on Wednesday.",
    check: (o) => !([3, 4].includes(pos(o, "diego")) && [3, 4].includes(pos(o, "chen"))),
  },
  {
    id: 6,
    text: "Aisha Bello must close at least one weekday shift (Monday or Wednesday evening).",
    check: (o) => pos(o, "aisha") === 2 || pos(o, "aisha") === 4,
  },
  { id: 7, text: "Naomi Park cannot work Mondays.", check: (o) => ![1, 2].includes(pos(o, "naomi")) },
  {
    id: 8,
    text: "Diego Cruz cannot open on Saturday (not yet trained to open solo).",
    check: (o) => pos(o, "diego") !== 5,
  },
];

export interface StaffScheduleCheckResult {
  id: number;
  text: string;
  satisfied: boolean;
}

/**
 * Evaluates a submitted order (array of 6 staff ids, slot 1 first) against
 * every constraint EXCEPT droppedConstraintId. Throws if the order isn't a
 * permutation of all six staff ids, or if droppedConstraintId isn't a valid
 * constraint id -- callers should validate those separately for a friendlier
 * error than a thrown exception.
 */
export function checkStaffSchedule(
  order: string[],
  droppedConstraintId: number
): { results: StaffScheduleCheckResult[]; allCorrect: boolean } {
  const validIds = new Set(STAFF.map((s) => s.id));
  const isPermutation =
    order.length === STAFF.length && order.every((id) => validIds.has(id)) && new Set(order).size === STAFF.length;
  if (!isPermutation) {
    throw new Error("Schedule must include each staff member exactly once");
  }
  if (!STAFF_CONSTRAINTS.some((c) => c.id === droppedConstraintId)) {
    throw new Error("droppedConstraintId must be a valid constraint id");
  }

  const results = STAFF_CONSTRAINTS.filter((c) => c.id !== droppedConstraintId).map((c) => ({
    id: c.id,
    text: c.text,
    satisfied: c.check(order),
  }));
  return { results, allCorrect: results.every((r) => r.satisfied) };
}
