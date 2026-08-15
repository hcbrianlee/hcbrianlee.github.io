/**
 * Fixed trip-planning scenario used for the "tripPlanning" task (a fourth
 * alternative task -- see src/lib/overrides.ts: activeTask). Same scenario
 * for every participant.
 *
 * This is deliberately an asymmetric-information collaboration, not a
 * solo AI-drafts/human-judges task: PRIVATE_FACTS are shown only to the
 * participant, never sent to the model automatically. The AI can only
 * account for what the participant actually chooses to tell it in chat --
 * deciding what to share, when, and how much to trust the AI's draft with
 * incomplete information is the human-judgment layer this task is built
 * around. There's no auto-check here (no check() function, unlike the
 * scheduling tasks) -- the final itinerary is logged for a human judge to
 * evaluate against how well it actually reflects PRIVATE_FACTS, alongside
 * the full chat transcript already captured in the events log.
 */
export interface TripPlanningScenario {
  title: string;
  /** Context both the participant and a reasonable AI assistant could infer or would naturally be told -- safe to paste into chat. */
  publicBrief: string;
  /** Shown only to the participant, never sent to the model automatically -- the AI only knows what gets typed into chat. */
  privateFacts: string[];
}

export const TRIP_PLANNING_SCENARIO: TripPlanningScenario = {
  title: "Weekend trip planning",
  publicBrief:
    "You're planning a 3-day weekend trip for yourself and two friends. You'll chat with an AI to help build " +
    "an itinerary -- where to stay, what to do each day, and roughly what it'll cost.",
  privateFacts: [
    "Your real total budget for all three of you is $600 -- you told the group \"around $900\" to leave yourself a cushion.",
    "One friend has a shellfish allergy -- no seafood restaurants or activities that involve shellfish.",
    "The other friend has a knee injury and can't do any hiking or activity requiring more than light, flat walking.",
    "You're secretly planning a surprise birthday moment for one of the two friends on day 2 -- you need an hour of unexplained \"free time\" blocked into that day without tipping them off.",
    "You have to be back by 6pm on the last day for a family video call -- this is non-negotiable, no matter how good the itinerary looks otherwise.",
  ],
};

/** Most trip itineraries a single session may submit. Fewer than caption/ad-caption submissions since this is a longer artifact. */
export const MAX_TRIP_PLAN_SUBMISSIONS = 3;
