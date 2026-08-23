import { getModelConfig } from "./models";
import type { ModelKey, PricingVariant } from "./types";

/**
 * Per-response cost charged against the participation credit.
 * - "flat": never charges a dollar amount -- capped by total tokens instead,
 *   see getFlatMaxTokens() below.
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

/**
 * "Flat" pricing has no dollar cost, but isn't truly unlimited: once a
 * session's cumulative total_tokens (across both models) reaches this,
 * /api/chat rejects further generations the same way "variable" does once
 * its dollar credit runs out -- see chat/route.ts. Env-configurable, same
 * pattern as FIXED_CREDIT_CENTS.
 */
export function getFlatMaxTokens(): number {
  return Number(process.env.FLAT_MAX_TOKENS ?? 10000);
}
