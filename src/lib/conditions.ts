import type { CopyBlock, InfoVariant, PricingVariant } from "./types";

/**
 * Nudge copy lives in code (not the DB) so wording can be iterated on and
 * reviewed like any other UI copy. The `conditions` table only stores which
 * variant a session was assigned to.
 */
export function getInfoCopy(variant: InfoVariant): CopyBlock | null {
  switch (variant) {
    case "environmental":
      return {
        title: "Lower environmental impact",
        body: "The light model emits less greenhouse gas and uses less water to cool the servers that run it than the heavy model.",
      };
    case "energy_usage":
      return {
        title: "Lower computational load",
        body: "The light model requires fewer computational resources — it's more efficient and uses less computer power per response than the heavy model.",
      };
    case "convenience":
      return {
        title: "Faster responses",
        body: "The light model responds faster than the heavy model, so you spend less time waiting.",
      };
    case "none":
    default:
      return null;
  }
}

/**
 * Null means: show nothing in the sidebar for this variant.
 * - "fixed" already explains its pricing on the pre-chat plan-picker screen
 *   (heavy/light, one flat price each) -- repeating it in the sidebar
 *   afterward is redundant, so it shows nothing here.
 * - "variable" and "free" both get a short note; "free" deliberately does
 *   not mention cost at all (there's nothing to say about it), just that
 *   the model can be switched anytime.
 */
export function getPricingCopy(variant: PricingVariant): CopyBlock | null {
  switch (variant) {
    case "variable":
      return {
        title: "Pay per use",
        body: "Heavy model: $0.02 per 1,000 tokens. Light model: $0.01 per 1,000 tokens, charged against your participation credit. You can toggle between the light and heavy model anytime in the chat below.",
      };
    case "fixed":
      return null;
    case "free":
    default:
      return {
        title: "Switch models anytime",
        body: "You can toggle between the light and heavy model anytime in the chat below.",
      };
  }
}
