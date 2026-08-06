import type { ModelKey, Provider } from "./types";

export interface ModelConfig {
  key: ModelKey;
  provider: Provider;
  model: string;
  label: string;
  description: string;
  /** Illustrative Wh per 1,000 tokens (input+output combined) used for the carbon estimate. */
  energyWhPer1kTokens: number;
  /** Price per 1,000 tokens in cents, used for the "variable" pricing condition. Matches the copy in conditions.ts. */
  pricePerThousandTokensCents: number;
  /** Flat one-time price in cents to pick this model under the "fixed" pricing condition. */
  fixedPlanPriceCents: number;
  /** Caption suggestions the assistant is instructed to give in every in-scope response. */
  suggestionCount: number;
  /**
   * Both heavy and light call the same underlying model (gpt-4o-mini) --
   * this is the artificial per-output-token delay (seconds) added after
   * generation completes, so "heavy" still behaves meaningfully slower.
   * 0 for light.
   */
  extraDelaySecPerToken: number;
  /**
   * Chance [0,1] that a response is nudged to deliberately include one
   * weaker/less-relevant suggestion, so "light" is actually less reliable,
   * not just labeled that way. 0 for heavy.
   */
  offSuggestionProbability: number;
}

function envProvider(name: string, fallback: Provider): Provider {
  const v = process.env[name];
  return v === "openai" || v === "anthropic" ? v : fallback;
}

export const MODELS: Record<ModelKey, ModelConfig> = {
  heavy: {
    key: "heavy",
    provider: envProvider("MODEL_HEAVY_PROVIDER", "openai"),
    model: process.env.MODEL_HEAVY_ID || "gpt-4o-mini",
    label: "Heavy",
    description: "More suggestions per response, consistently on-target, but slower to respond.",
    energyWhPer1kTokens: Number(process.env.MODEL_HEAVY_ENERGY_WH_PER_1K ?? 1.0),
    pricePerThousandTokensCents: Number(process.env.MODEL_HEAVY_PRICE_CENTS_PER_1K ?? 2),
    fixedPlanPriceCents: Number(process.env.MODEL_HEAVY_FIXED_PLAN_CENTS ?? 200),
    suggestionCount: Number(process.env.MODEL_HEAVY_SUGGESTION_COUNT ?? 5),
    extraDelaySecPerToken: Number(process.env.MODEL_HEAVY_EXTRA_DELAY_SEC_PER_TOKEN ?? 0.5),
    offSuggestionProbability: 0,
  },
  light: {
    key: "light",
    provider: envProvider("MODEL_LIGHT_PROVIDER", "openai"),
    model: process.env.MODEL_LIGHT_ID || "gpt-4o-mini",
    label: "Light",
    description: "Fewer suggestions per response, faster, but occasionally a weaker suggestion slips in.",
    energyWhPer1kTokens: Number(process.env.MODEL_LIGHT_ENERGY_WH_PER_1K ?? 0.2),
    pricePerThousandTokensCents: Number(process.env.MODEL_LIGHT_PRICE_CENTS_PER_1K ?? 1),
    fixedPlanPriceCents: Number(process.env.MODEL_LIGHT_FIXED_PLAN_CENTS ?? 100),
    suggestionCount: Number(process.env.MODEL_LIGHT_SUGGESTION_COUNT ?? 2),
    extraDelaySecPerToken: 0,
    offSuggestionProbability: Number(process.env.MODEL_LIGHT_OFF_SUGGESTION_PROBABILITY ?? 0.5),
  },
};

export function getModelConfig(key: ModelKey): ModelConfig {
  const cfg = MODELS[key];
  if (!cfg) throw new Error(`Unknown model key: ${key}`);
  return cfg;
}
