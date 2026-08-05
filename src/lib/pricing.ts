import { getModelConfig } from "./models";
import type { ModelKey, PricingVariant } from "./types";

/**
 * Only the "free" pricing condition is actually free -- "variable" and
 * "fixed" both draw down the session's participation credit per the copy in
 * conditions.ts (variable shows the per-token price up front; fixed doesn't
 * show a price but still depletes the same way). Both use the same
 * per-model per-token cost; what differs between them is only the nudge
 * copy, not the underlying economics.
 */
export function estimateCostCents(params: {
  modelKey: ModelKey;
  totalTokens: number;
  pricingVariant: PricingVariant;
}): number {
  if (params.pricingVariant === "free") return 0;

  const cfg = getModelConfig(params.modelKey);
  return (params.totalTokens / 1000) * cfg.pricePerThousandTokensCents;
}
