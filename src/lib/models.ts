import type { ModelKey, Provider } from "./types";

export interface ModelConfig {
  key: ModelKey;
  provider: Provider;
  model: string;
  label: string;
  description: string;
  /** Illustrative Wh per 1,000 tokens (input+output combined) used for the carbon estimate. */
  energyWhPer1kTokens: number;
  /** Price per 1,000 tokens in cents, used for the "variable"/"fixed" pricing conditions. Matches the copy in conditions.ts. */
  pricePerThousandTokensCents: number;
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
    description: "Higher-power model. Generally higher quality, higher energy use per response.",
    energyWhPer1kTokens: Number(process.env.MODEL_HEAVY_ENERGY_WH_PER_1K ?? 5.6),
    pricePerThousandTokensCents: Number(process.env.MODEL_HEAVY_PRICE_CENTS_PER_1K ?? 2),
  },
  light: {
    key: "light",
    provider: envProvider("MODEL_LIGHT_PROVIDER", "openai"),
    model: process.env.MODEL_LIGHT_ID || "gpt-4o-mini",
    label: "Light",
    description: "Lower-power model. Faster, lower energy use per response.",
    energyWhPer1kTokens: Number(process.env.MODEL_LIGHT_ENERGY_WH_PER_1K ?? 1.2),
    pricePerThousandTokensCents: Number(process.env.MODEL_LIGHT_PRICE_CENTS_PER_1K ?? 1),
  },
};

export function getModelConfig(key: ModelKey): ModelConfig {
  const cfg = MODELS[key];
  if (!cfg) throw new Error(`Unknown model key: ${key}`);
  return cfg;
}
