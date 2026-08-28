import { getModelConfig } from "./models";
import type { ImpactEstimate, ModelComparison, ModelKey } from "./types";

// Hypothetical group size used to scale the per-1,000-token comparison into
// a more tangible aggregate figure for the nudge copy ("if N people did
// this..."). A single response's savings are a fraction of a gram/mL/Wh --
// too small to feel consequential -- multiplying by a large, recognizable
// number makes the same underlying figures legible without changing what
// they represent. Default is OpenAI's own reported ChatGPT weekly active
// user count (900 million, announced Feb 2026, still current as of Jul
// 2026) -- used here purely as a relatable reference scale for "a lot of AI
// chat usage," not a claim that this app has that many users. Revisit this
// number periodically as OpenAI reports updated figures.
const NUDGE_IMPACT_SCALE_USERS = Number(process.env.NUDGE_IMPACT_SCALE_USERS ?? 900_000_000);

// Sourced 2026: IEA global average grid intensity (~420-430 g/kWh for
// 2025-2026, declining ~3.7%/yr from 445 in 2024) and average data-center
// water-usage-effectiveness (~1.9 L/kWh, Patterns/Cell Press 2025). Override
// via env for a specific deployment/region -- these remain global averages,
// not a precise physical measurement for any one data center, so flag that
// explicitly in any participant-facing copy or publication.
const GRID_CARBON_INTENSITY_G_PER_KWH = Number(process.env.GRID_CARBON_INTENSITY_G_PER_KWH ?? 425);
const WATER_ML_PER_KWH = Number(process.env.WATER_ML_PER_KWH ?? 1900);

// EPA's Greenhouse Gas Equivalencies Calculator figure for a typical
// gasoline passenger vehicle: ~404 g CO2 per mile driven. Used to translate
// an abstract gram/ton figure into a "driving X miles" equivalence that's
// easier to feel than a raw mass unit.
const CO2_G_PER_MILE_DRIVEN = Number(process.env.CO2_G_PER_MILE_DRIVEN ?? 404);

export function milesFromCo2G(co2G: number): number {
  return co2G / CO2_G_PER_MILE_DRIVEN;
}

// Reference generation speed used to translate response time into a "load"
// adjustment, per the design doc's idea of using response time as a proxy
// for prompt/response complexity. Clamped so an unusually slow or fast
// network round-trip can't swing the estimate by more than +/-50%.
const REFERENCE_SECONDS_PER_TOKEN = 0.02;
const MIN_LOAD_FACTOR = 0.85;
const MAX_LOAD_FACTOR = 1.5;

/** Fallback average response length (tokens) before any real response_received data exists for a model -- see getAverageTokensPerModel, src/lib/session.ts. Roughly matches the "~300-500 token query" figure cited in .env.example's energy sourcing comment. */
export const DEFAULT_AVG_RESPONSE_TOKENS = 400;

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

/** Static (no load factor) impact for an arbitrary token count -- a reference figure, not a measurement of one specific response. */
function estimateStaticImpact(modelKey: ModelKey, totalTokens: number): ImpactEstimate {
  const cfg = getModelConfig(modelKey);
  const energyWh = (totalTokens / 1000) * cfg.energyWhPer1kTokens;
  const energyKWh = energyWh / 1000;
  return {
    energyWh,
    co2G: energyKWh * GRID_CARBON_INTENSITY_G_PER_KWH,
    waterMl: energyKWh * WATER_ML_PER_KWH,
  };
}

function perThousandTokens(modelKey: ModelKey): ImpactEstimate {
  return estimateStaticImpact(modelKey, 1000);
}

/**
 * Typical per-response token count and CO2 for each model, used for the
 * "token"/"environmental" model-toggle captions (ModelPicker.tsx). Prefers
 * a real platform-wide average (getAverageTokensPerModel, src/lib/session.ts)
 * over a guess -- avgTokens comes from that; CO2 is derived from it via the
 * same static per-token conversion used everywhere else in this file, not a
 * separately-logged average (co2 is a deterministic function of tokens).
 */
export function estimateAverageResponseImpact(
  modelKey: ModelKey,
  avgTokens: number
): { tokens: number; co2G: number } {
  return { tokens: avgTokens, co2G: estimateStaticImpact(modelKey, avgTokens).co2G };
}

/**
 * Static heavy vs. light comparison per 1,000 tokens -- no load factor,
 * since this is a reference figure shown alongside the model picker, not a
 * measurement of one specific response. Used for the environmental /
 * environmental_token nudge copy under each model toggle.
 */
export function getModelComparison(): ModelComparison {
  const heavy = perThousandTokens("heavy");
  const light = perThousandTokens("light");
  return {
    heavy,
    light,
    deltaEnergyWh: heavy.energyWh - light.energyWh,
    deltaCo2G: heavy.co2G - light.co2G,
    deltaWaterMl: heavy.waterMl - light.waterMl,
    scaleUsers: NUDGE_IMPACT_SCALE_USERS,
  };
}
