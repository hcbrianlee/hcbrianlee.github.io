import type { CopyBlock, PricingVariant } from "./types";

/**
 * The info_variant nudge itself is no longer static prose -- it's the live
 * numeric stat blocks in the sidebar (token count, CO2 used) plus the
 * per-model CO2 comparison under the model toggle (see ModelPicker.tsx
 * modelCaption()). There's nothing left for a getInfoCopy()-style function
 * to return, so it was removed along with the "fixed" pricing condition
 * that was its only consumer.
 */

/**
 * Null means: show nothing in the sidebar's pricing note.
 * "variable" discloses the hard stop explicitly -- V0 (design doc, 2026-08)
 * specifies participants literally cannot send more messages once their
 * budget is used up, so that needs to be stated up front, not discovered
 * mid-session. "flat" has nothing to disclose (no budget, no per-message
 * cost) beyond the model toggle being freely switchable.
 */
export function getPricingCopy(variant: PricingVariant): CopyBlock | null {
  switch (variant) {
    case "variable":
      return {
        title: "Pay per use",
        body: "Heavy model: $0.02 per 1,000 tokens. Light model: $0.01 per 1,000 tokens, charged against your participation credit. Once your credit runs out, you won't be able to send more messages for the rest of this session. You can toggle between the light and heavy model anytime.",
      };
    case "flat":
    default:
      return {
        title: "Unlimited use",
        body: "There's no per-message cost and no budget cap for this session. You can toggle between the light and heavy model anytime in the chat below.",
      };
  }
}
