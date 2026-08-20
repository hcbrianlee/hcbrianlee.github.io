import { getModelConfig } from "./models";
import type { ModelKey, PricingVariant } from "./types";

/**
 * Per-response cost charged against the participation credit.
 * - "flat": never charges (no budget cap for this condition).
 * - "variable": charges (tokens / 1000) * price-per-1k-tokens on every
 *   response -- the price is shown up front in the nudge copy, and once
 *   cumulative spend reaches the participation credit, /api/chat rejects
 *   further generations for the session (see chat/route.ts).
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
