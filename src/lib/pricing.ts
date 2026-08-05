import { getModelConfig } from "./models";
import type { ModelKey, PricingVariant } from "./types";

/**
 * Per-response cost charged against the participation credit.
 * - "free": never charges.
 * - "variable": charges (tokens / 1000) * price-per-1k-tokens on every
 *   response -- the price is shown up front in the nudge copy.
 * - "fixed": charges nothing per response. The cost was already paid as a
 *   one-time flat fee when the participant picked heavy/light before
 *   chatting -- see getFixedPlanPriceCents() and /api/select-plan.
 */
export function estimateCostCents(params: {
  modelKey: ModelKey;
  totalTokens: number;
  pricingVariant: PricingVariant;
}): number {
  if (params.pricingVariant !== "variable") return 0;

  const cfg = getModelConfig(params.modelKey);
  return (params.totalTokens / 1000) * cfg.pricePerThousandTokensCents;
}

export function getFixedPlanPriceCents(modelKey: ModelKey): number {
  return getModelConfig(modelKey).fixedPlanPriceCents;
}
