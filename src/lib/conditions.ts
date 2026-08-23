import type { CopyBlock, PricingVariant } from "./types";

/**
 * The info_variant nudge itself is no longer static prose -- it's the live
 * numeric stat blocks in the sidebar (token count, CO2 used) plus the
 * per-response average-usage captions under the model toggle (see
 * ModelPicker.tsx). There's nothing left for a getInfoCopy()-style function
 * to return, so it was removed along with the "fixed" pricing condition
 * that was its only consumer.
 */

/**
 * Null means: show nothing in the sidebar's pricing note. Both variants
 * disclose their hard stop explicitly -- stated up front, not discovered
 * mid-session.
 */
export function getPricingCopy(variant: PricingVariant, maxTokensPerSession: number): CopyBlock | null {
  const tokenLimit = maxTokensPerSession.toLocaleString();
  switch (variant) {
    case "variable":
      return {
        title: "Pay per use",
        body: `Heavy model: $0.02 per 1,000 tokens. Light model: $0.01 per 1,000 tokens, charged against your participation credit. There's also a limit of ${tokenLimit} total tokens for this session. Once you reach either limit, you won't be able to send more messages. You can toggle between the light and heavy model anytime.`,
      };
    case "flat":
    default:
      return {
        title: "Unlimited use",
        body: `There's no per-message cost for this session, but there's a limit of ${tokenLimit} total tokens -- once you reach that, you won't be able to send more messages. You can toggle between the light and heavy model anytime in the chat below.`,
      };
  }
}
