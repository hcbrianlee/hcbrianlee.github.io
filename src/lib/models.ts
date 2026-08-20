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
  /**
   * Heavy (gpt-4o) and light (gpt-4o-mini) are genuinely different real
   * models -- same family/generation (OpenAI's own flagship/mini pair), so
   * light is reliably the smaller sibling rather than an ambiguous
   * cross-generation comparison. This artificial delay (seconds) is on top
   * of that, further reinforcing "heavy takes longer." Applied once per
   * generation completes, as extraDelayBaseSec +/- extraDelayJitterSec
   * (uniformly random). Not proportional to response length -- a flat,
   * roughly 3-second-ish pause regardless of how much text came back.
   * 0/0 for light.
   */
  extraDelayBaseSec: number;
  extraDelayJitterSec: number;
  /**
   * Sampling temperature. Heavy stays low/focused (consistently on-target
   * suggestions); light runs hot enough that an occasional suggestion comes
   * out noticeably weaker or a bit off-topic, without ever prompting the
   * model to sandbag itself -- the quality variance is real, not staged.
   * OpenAI's scale is 0-2 (1.5 is toward the upper end of coherent for
   * gpt-4o-mini); Anthropic's is 0-1 (clamped in
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
  /**
   * Reasoning-model-only knob ("low" | "medium" | "high") -- ignored for
   * standard chat models like light (gpt-4o-mini). Only meaningful for
   * heavy now that it's an o-series reasoning model (see providers/openai.ts
   * isReasoningModel). Null lets the API use its own default.
   */
  reasoningEffort: string | null;
}

function envProvider(name: string, fallback: Provider): Provider {
  const v = process.env[name];
  return v === "openai" || v === "anthropic" ? v : fallback;
}

export const MODELS: Record<ModelKey, ModelConfig> = {
  heavy: {
    key: "heavy",
    provider: envProvider("MODEL_HEAVY_PROVIDER", "openai"),
    // o4-mini: an actual OpenAI reasoning model (see providers/openai.ts
    // isReasoningModel), chosen over o3 for cost/latency -- it reasons
    // before answering (unlike gpt-4o), which is what the scheduling task
    // needs, while staying cheaper and faster than o3 to actually run.
    model: process.env.MODEL_HEAVY_ID || "o4-mini",
    label: "Heavy",
    description: "Consistently on-target, but takes noticeably longer to respond.",
    // NOTE: energyWhPer1kTokens and pricePerThousandTokensCents below are
    // sourced from o3's published stats, not o4-mini's -- see .env.example
    // for the full rationale. This is a deliberate mismatch: the nudge copy
    // participants see reflects o3-level cost/impact, while generation
    // actually runs on the cheaper/faster o4-mini.
    energyWhPer1kTokens: Number(process.env.MODEL_HEAVY_ENERGY_WH_PER_1K ?? 15),
    pricePerThousandTokensCents: Number(process.env.MODEL_HEAVY_PRICE_CENTS_PER_1K ?? 13),
    extraDelayBaseSec: Number(process.env.MODEL_HEAVY_EXTRA_DELAY_BASE_SEC ?? 3),
    extraDelayJitterSec: Number(process.env.MODEL_HEAVY_EXTRA_DELAY_JITTER_SEC ?? 1),
    // Ignored by o4-mini (reasoning models reject temperature/top_p via the
    // API) -- kept here only so light's fallback logic and /admin's shared
    // NumberField code stay uniform. See reasoningEffort below for the
    // param that actually does something on heavy now.
    temperature: Number(process.env.MODEL_HEAVY_TEMPERATURE ?? 0.7),
    topP: Number(process.env.MODEL_HEAVY_TOP_P ?? 1.0),
    reasoningEffort: process.env.MODEL_HEAVY_REASONING_EFFORT || "high",
  },
  light: {
    key: "light",
    provider: envProvider("MODEL_LIGHT_PROVIDER", "openai"),
    model: process.env.MODEL_LIGHT_ID || "gpt-4o-mini",
    label: "Light",
    description: "Faster, but occasionally a weaker or slightly off-topic suggestion slips in.",
    energyWhPer1kTokens: Number(process.env.MODEL_LIGHT_ENERGY_WH_PER_1K ?? 0.2),
    pricePerThousandTokensCents: Number(process.env.MODEL_LIGHT_PRICE_CENTS_PER_1K ?? 1),
    extraDelayBaseSec: 0,
    extraDelayJitterSec: 0,
    temperature: Number(process.env.MODEL_LIGHT_TEMPERATURE ?? 1.5),
    topP: Number(process.env.MODEL_LIGHT_TOP_P ?? 0.5),
    reasoningEffort: null,
  },
};

export function getModelConfig(key: ModelKey): ModelConfig {
  const cfg = MODELS[key];
  if (!cfg) throw new Error(`Unknown model key: ${key}`);
  return cfg;
}
