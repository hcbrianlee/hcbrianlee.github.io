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

export function getPricingCopy(variant: PricingVariant): CopyBlock {
  switch (variant) {
    case "variable":
      return {
        title: "Pay per use",
        body: "Heavy model: $0.02 per 1,000 tokens. Light model: $0.01 per 1,000 tokens. Usage is charged against your participation credit.",
      };
    case "fixed":
      return {
        title: "Fixed session credit",
        body: "You have a fixed credit for this session. Using the heavy model draws down your credit faster than the light model.",
      };
    case "free":
    default:
      return {
        title: "Free to use",
        body: "Both models are free to use during this session — there's no cost to you either way.",
      };
  }
}
