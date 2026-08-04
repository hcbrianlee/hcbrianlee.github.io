import { getModelConfig } from "./models";
import type { ImpactEstimate, ModelKey } from "./types";

// Illustrative global-average figures, override via env for a specific
// deployment/region. There is no single authoritative per-token energy
// figure for hosted LLM inference, so treat this estimator as a relative
// comparison device (heavy vs. light, session vs. session) rather than a
// precise physical measurement -- flag this explicitly in any participant-
// facing copy or publication.
const GRID_CARBON_INTENSITY_G_PER_KWH = Number(process.env.GRID_CARBON_INTENSITY_G_PER_KWH ?? 475);
const WATER_ML_PER_KWH = Number(process.env.WATER_ML_PER_KWH ?? 1800);

// Reference generation speed used to translate response time into a "load"
// adjustment, per the design doc's idea of using response time as a proxy
// for prompt/response complexity. Clamped so an unusually slow or fast
// network round-trip can't swing the estimate by more than +/-50%.
const REFERENCE_SECONDS_PER_TOKEN = 0.02;
const MIN_LOAD_FACTOR = 0.85;
const MAX_LOAD_FACTOR = 1.5;

export function estimateImpact(params: {
  modelKey: ModelKey;
  totalTokens: number;
  responseTimeMs: number;
}): ImpactEstimate {
  const { modelKey, totalTokens, responseTimeMs } = params;
  const cfg = getModelConfig(modelKey);

  const baseEnergyWh = (totalTokens / 1000) * cfg.energyWhPer1kTokens;

  const secondsPerToken = totalTokens > 0 ? responseTimeMs / 1000 / totalTokens : REFERENCE_SECONDS_PER_TOKEN;
  const loadFactor = Math.min(
    MAX_LOAD_FACTOR,
    Math.max(MIN_LOAD_FACTOR, secondsPerToken / REFERENCE_SECONDS_PER_TOKEN)
  );

  const energyWh = baseEnergyWh * loadFactor;
  const energyKWh = energyWh / 1000;

  return {
    energyWh,
    co2G: energyKWh * GRID_CARBON_INTENSITY_G_PER_KWH,
    waterMl: energyKWh * WATER_ML_PER_KWH,
  };
}
