/**
 * Fixed negotiation scenario used for the "negotiation" task (a fourth
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
 * scheduling tasks) -- the final memo is logged for a human judge to
 * evaluate against how well it actually reflects PRIVATE_FACTS, alongside
 * the full chat transcript already captured in the events log.
 */
export interface NegotiationScenario {
  title: string;
  /** Context both the participant and a reasonable AI assistant could infer or would naturally be told -- safe to paste into chat. */
  publicBrief: string;
  /** Shown only to the participant, never sent to the model automatically -- the AI only knows what gets typed into chat. */
  privateFacts: string[];
}

export const NEGOTIATION_SCENARIO: NegotiationScenario = {
  title: "Vendor contract negotiation",
  publicBrief:
    "You're the procurement lead at a mid-size company negotiating a new 3-year software licensing contract " +
    "with a vendor. The budget ceiling you've stated publicly to the vendor is $100,000/year. You're meeting " +
    "with the vendor's account team next week and want a negotiation strategy going in.",
  privateFacts: [
    "Your actual internal budget ceiling is $85,000/year -- the $100,000 figure you've given the vendor has slack built in on purpose.",
    "Go-live is effectively non-negotiable: the contract needs to be signed and the system live by September 1.",
    "You'd accept a 2-year term instead of 3 if the vendor drops the per-seat price by at least 8%.",
    "Dealbreaker: you will walk away if the vendor won't grant full data export/portability rights in the contract.",
    "You have a competing quote from another vendor at $92/seat -- you'd rather hold this in reserve as leverage than reveal it upfront.",
  ],
};

/** Most negotiation strategy memos a single session may submit. Fewer than caption/ad-caption submissions since this is a longer artifact. */
export const MAX_NEGOTIATION_SUBMISSIONS = 3;
