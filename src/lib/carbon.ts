import { getModelConfig } from "./models";
import type { ImpactEstimate, ModelKey } from "./types";

// Sourced 2026: IEA global average grid intensity (~420-430 g/kWh for
// 2025-2026, declining ~3.7%/yr from 445 in 2024) and average data-center
// water-usage-effectiveness (~1.9 L/kWh, Patterns/Cell Press 2025). Override
// via env for a specific deployment/region -- these remain global averages,
// not a precise physical measurement for any one data center, so flag that
// explicitly in any participant-facing copy or publication.
const GRID_CARBON_INTENSITY_G_PER_KWH = Number(process.env.GRID_CARBON_INTENSITY_G_PER_KWH ?? 425);
const WATER_ML_PER_KWH = Number(process.env.WATER_ML_PER_KWH ?? 1900);

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

function perThousandTokens(modelKey: ModelKey): ImpactEstimate {
  const cfg = getModelConfig(modelKey);
  const energyWh = cfg.energyWhPer1kTokens;
  const energyKWh = energyWh / 1000;
  return {
    energyWh,
    co2G: energyKWh * GRID_CARBON_INTENSITY_G_PER_KWH,
    waterMl: energyKWh * WATER_ML_PER_KWH,
  };
}

/**
 * Static heavy vs. light comparison per 1,000 tokens -- no load factor,
 * since this is a reference figure shown alongside the model picker, not a
 * measurement of one specific response. Used for the environmental/
 * energy_usage nudge copy under each model toggle.
 */
export function getModelComparison(): {
  heavy: ImpactEstimate;
  light: ImpactEstimate;
  deltaEnergyWh: number;
  deltaCo2G: number;
  deltaWaterMl: number;
} {
  const heavy = perThousandTokens("heavy");
  const light = perThousandTokens("light");
  return {
    heavy,
    light,
    deltaEnergyWh: heavy.energyWh - light.energyWh,
    deltaCo2G: heavy.co2G - light.co2G,
    deltaWaterMl: heavy.waterMl - light.waterMl,
  };
}
