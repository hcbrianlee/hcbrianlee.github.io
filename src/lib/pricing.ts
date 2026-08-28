import { getModelConfig } from "./models";
import type { ModelKey, PricingVariant } from "./types";

/**
 * Per-response cost charged against the participation credit.
 * - "flat": never charges a dollar amount.
 * - "variable": charges (tokens / 1000) * price-per-1k-tokens on every
 *   response -- the price is shown up front in the nudge copy, and once
 *   cumulative spend reaches the participation credit, /api/chat rejects
 *   further generations for the session (see chat/route.ts). This is on
 *   top of the universal token cap below -- both apply under "variable".
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
 * Total-token cap for a session, applied uniformly to BOTH pricing
 * variants: once cumulative total_tokens (across both models) reaches
 * this, /api/chat rejects further generations regardless of pricing_variant
 * (see chat/route.ts). "variable" additionally caps by dollar credit on
 * top of this; "flat" has no dollar cost, so this is its only limit.
 * Env-configurable (MAX_TOKENS_PER_SESSION), same pattern as
 * FIXED_CREDIT_CENTS -- `override` is /admin's live
 * ExperimentOverrides.maxTokensPerSession, which takes precedence over the
 * env default when set.
 */
export function getMaxTokensPerSession(override?: number | null): number {
  return override ?? Number(process.env.MAX_TOKENS_PER_SESSION ?? 10000);
}
