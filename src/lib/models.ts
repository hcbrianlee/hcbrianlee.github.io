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
   * Sampling temperature. Heavy stays low/focused (consistently on-target
   * suggestions); light runs hot enough that an occasional suggestion comes
   * out noticeably weaker or a bit off-topic, without ever prompting the
   * model to sandbag itself -- the quality variance is real, not staged.
   * OpenAI's scale is 0-2; Anthropic's is 0-1 (clamped in
   * src/lib/providers/anthropic.ts if a light/heavy model is ever pointed
   * at Anthropic).
   */
  temperature: number;
  /**
   * Nucleus sampling threshold [0,1]. Lowering top_p on its own pulls
   * output *toward* safer/more focused text -- the opposite of what light
   * is going for -- so light pairs a raised temperature with only a mild
   * top_p cut, just enough to cap the extreme tail (avoiding incoherent
   * output) without cancelling out the variety the higher temperature is
   * there to produce. Heavy stays at 1 (no restriction), consistent with
   * its already-low temperature keeping it focused.
   */
  topP: number;
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
    temperature: Number(process.env.MODEL_HEAVY_TEMPERATURE ?? 0.7),
    topP: Number(process.env.MODEL_HEAVY_TOP_P ?? 1.0),
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
    temperature: Number(process.env.MODEL_LIGHT_TEMPERATURE ?? 1.2),
    topP: Number(process.env.MODEL_LIGHT_TOP_P ?? 0.9),
  },
};

export function getModelConfig(key: ModelKey): ModelConfig {
  const cfg = MODELS[key];
  if (!cfg) throw new Error(`Unknown model key: ${key}`);
  return cfg;
}
