/**
 * Fixed 6-staff / 6-shift weekly schedule used for the "staffScheduling" task
 * (a third alternative to the cartoon caption task and the speaker
 * scheduling puzzle -- see src/lib/overrides.ts: activeTask). Unlike the
 * speaker puzzle, this one is deliberately INFEASIBLE as given: no
 * assignment of the 6 staff to the 6 shifts satisfies all 5 constraints at
 * once (verified by brute force over all 720 permutations -- 0 solutions).
 *
 * The task isn't "find the answer" -- it's: notice it's unsolvable, work
 * out which single constraint is the actual structural blocker (only
 * dropping constraint id 1 makes it solvable; dropping any other single
 * constraint alone still leaves 0 solutions -- also brute-force verified),
 * write a rationale for why that's the right one to relax, and then produce
 * an assignment satisfying everything else. There's no single "correct"
 * final schedule (72 different assignments satisfy the remaining 4
 * constraints once #1 is dropped) -- the schedule, the dropped constraint,
 * and the rationale are logged together for a human judge to evaluate
 * later, not auto-graded pass/fail the way the speaker puzzle is.
 *
 * Each staff member's `background` is what makes the rationale a real
 * judgment call rather than a coin flip: the 4 non-#1 constraints aren't
 * interchangeable inconveniences -- one is a genuine safety/training issue
 * (Diego), two are structurally fixed availability, not preferences (Chen,
 * Rosa), and #1 itself is a coverage policy rather than tied to any one
 * person's circumstances. A good rationale should engage with which
 * constraint is *least costly* to relax given who it actually affects and
 * why, not just which one the math forces.
 */
export interface StaffMember {
  id: string;
  name: string;
  keyholder: boolean;
  /** Free-text context (tenure, role, why their constraint exists) for grounding a rationale -- not read by any check() function. */
  background: string;
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
  {
    id: "jordan",
    name: "Jordan Reyes",
    keyholder: true,
    background:
      "5-year keyholder, one of the most experienced and trusted staff on the team. Has a standing Saturday " +
      "family commitment and hasn't been scheduled on a Saturday once in 5 years.",
  },
  {
    id: "naomi",
    name: "Naomi Park",
    keyholder: true,
    background:
      "Certified keyholder, promoted 6 months ago and still building confidence running a shift solo. No fixed " +
      "availability restrictions.",
  },
  {
    id: "aisha",
    name: "Aisha Bello",
    keyholder: false,
    background:
      "Reliable all-rounder with flexible availability, currently cross-training toward keyholder certification " +
      "but not yet signed off.",
  },
  {
    id: "diego",
    name: "Diego Cruz",
    keyholder: false,
    background:
      "New hire (2 months in). Enthusiastic and a fast learner, but store policy requires 3 months tenure plus a " +
      "supervisor sign-off before anyone opens solo -- he hasn't hit either yet.",
  },
  {
    id: "chen",
    name: "Chen Wu",
    keyholder: false,
    background:
      "Part-time, full-time student during the day. Evening-only availability is fixed by his class schedule, " +
      "not a preference -- he's not able to be in the building most mornings, period.",
  },
  {
    id: "rosa",
    name: "Rosa Delgado",
    keyholder: false,
    background:
      "Part-time, single parent with morning-only childcare coverage. Morning-only availability is a fixed " +
      "logistical constraint, not a preference -- there's no one to cover evenings for her.",
  },
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
  {
    id: 2,
    text: "Diego Cruz cannot open any shift solo (not yet trained/signed off).",
    check: (o) => ![1, 3, 5].includes(pos(o, "diego")),
  },
  { id: 3, text: "Chen Wu is only available for evening shifts.", check: (o) => [2, 4, 6].includes(pos(o, "chen")) },
  { id: 4, text: "Rosa Delgado is only available for morning shifts.", check: (o) => [1, 3, 5].includes(pos(o, "rosa")) },
  { id: 5, text: "Jordan Reyes cannot work Saturdays.", check: (o) => ![5, 6].includes(pos(o, "jordan")) },
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
