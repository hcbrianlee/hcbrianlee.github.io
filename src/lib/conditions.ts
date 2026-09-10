import type { CopyBlock } from "./types";

/**
 * The info_variant nudge itself is no longer static prose -- it's the live
 * numeric stat blocks in FloatingChat's nudge panel (token count, CO2
 * used) plus the per-response average-usage captions under the model
 * toggle (see ModelPicker.tsx). There's nothing left for a getInfoCopy()-
 * style function to return, so it was removed along with the "fixed"
 * pricing condition that was its only consumer.
 */

/**
 * FloatingChat's token-cap disclosure -- shown only for "variable" pricing
 * (see getMaxTokensPerSession, src/lib/pricing.ts); "flat" never calls
 * this. No dollar-pricing detail is shown anywhere in the UI (removed per
 * instruction).
 */
export function getPricingCopy(maxTokensPerSession: number): CopyBlock {
  return {
    title: "Token limit",
    body: `Total tokens available: ${maxTokensPerSession.toLocaleString()}.`,
  };
}
