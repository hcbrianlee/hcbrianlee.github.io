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
  /**
   * Both heavy and light call the same underlying model (gpt-4o) --
   * this artificial delay (seconds) is what makes "heavy" still behave
   * meaningfully slower. Applied once per response, after generation
   * completes, as extraDelayBaseSec +/- extraDelayJitterSec (uniformly
   * random). Not proportional to response length -- a flat, roughly
   * 3-second-ish pause regardless of how much text came back. 0/0 for light.
   */
  extraDelayBaseSec: number;
  extraDelayJitterSec: number;
  /**
   * Sampling temperature. Heavy stays low/focused (consistently on-target
   * suggestions); light runs hot enough that an occasional suggestion comes
   * out noticeably weaker or a bit off-topic, without ever prompting the
   * model to sandbag itself -- the quality variance is real, not staged.
   * OpenAI's scale is 0-2 (1.5 is toward the upper end of coherent for
   * gpt-4o); Anthropic's is 0-1 (clamped in
   * src/lib/providers/anthropic.ts if a light/heavy model is ever pointed
   * at Anthropic).
   */
  temperature: number;
  /**
   * Nucleus sampling threshold [0,1]. Lowering top_p on its own pulls
   * output *toward* safer/more focused text, which normally works against
   * a raised temperature -- but at light's current 0.5, the cut is
   * aggressive enough that it's doing real work restraining temperature
   * 1.5's tail, not just a light touch. Watch for output drifting toward
   * repetitive/bland rather than "occasionally weaker" if tightened
   * further. Heavy stays at 1 (no restriction), consistent with its
   * already-low temperature keeping it focused.
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
    model: process.env.MODEL_HEAVY_ID || "gpt-4o",
    label: "Heavy",
    description: "Consistently on-target, but takes noticeably longer to respond.",
    energyWhPer1kTokens: Number(process.env.MODEL_HEAVY_ENERGY_WH_PER_1K ?? 1.0),
    pricePerThousandTokensCents: Number(process.env.MODEL_HEAVY_PRICE_CENTS_PER_1K ?? 2),
    fixedPlanPriceCents: Number(process.env.MODEL_HEAVY_FIXED_PLAN_CENTS ?? 200),
    extraDelayBaseSec: Number(process.env.MODEL_HEAVY_EXTRA_DELAY_BASE_SEC ?? 3),
    extraDelayJitterSec: Number(process.env.MODEL_HEAVY_EXTRA_DELAY_JITTER_SEC ?? 1),
    temperature: Number(process.env.MODEL_HEAVY_TEMPERATURE ?? 0.7),
    topP: Number(process.env.MODEL_HEAVY_TOP_P ?? 1.0),
  },
  light: {
    key: "light",
    provider: envProvider("MODEL_LIGHT_PROVIDER", "openai"),
    model: process.env.MODEL_LIGHT_ID || "gpt-4o",
    label: "Light",
    description: "Faster, but occasionally a weaker or slightly off-topic suggestion slips in.",
    energyWhPer1kTokens: Number(process.env.MODEL_LIGHT_ENERGY_WH_PER_1K ?? 0.2),
    pricePerThousandTokensCents: Number(process.env.MODEL_LIGHT_PRICE_CENTS_PER_1K ?? 1),
    fixedPlanPriceCents: Number(process.env.MODEL_LIGHT_FIXED_PLAN_CENTS ?? 100),
    extraDelayBaseSec: 0,
    extraDelayJitterSec: 0,
    temperature: Number(process.env.MODEL_LIGHT_TEMPERATURE ?? 1.5),
    topP: Number(process.env.MODEL_LIGHT_TOP_P ?? 0.5),
  },
};

export function getModelConfig(key: ModelKey): ModelConfig {
  const cfg = MODELS[key];
  if (!cfg) throw new Error(`Unknown model key: ${key}`);
  return cfg;
}
