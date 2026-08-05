"use client";

import type { InfoVariant, ModelComparison, ModelKey } from "@/lib/types";
import { formatGrams, formatMlPrecise, formatWh } from "@/lib/format";

function modelCaption(variant: InfoVariant, model: ModelKey, comparison: ModelComparison): string | null {
  const n = comparison.scaleUsers;
  const scaledDeltaEnergyWh = comparison.deltaEnergyWh * n;
  const scaledHeavyEnergyWh = comparison.heavy.energyWh * n;
  const scaledDeltaCo2G = comparison.deltaCo2G * n;
  const scaledDeltaWaterMl = comparison.deltaWaterMl * n;

  if (variant === "environmental") {
    if (model === "light") {
      return `If ${n} people did the same, that's ${formatWh(scaledDeltaEnergyWh)} saved, along with ${formatGrams(scaledDeltaCo2G)} less CO₂ and ${formatMlPrecise(scaledDeltaWaterMl)} less water, per 1,000 tokens each.`;
    }
    return `If ${n} people did the same, that's ${formatWh(scaledHeavyEnergyWh)} used, leading to ${formatGrams(scaledDeltaCo2G)} more CO₂ and ${formatMlPrecise(scaledDeltaWaterMl)} more water, per 1,000 tokens each.`;
  }
  if (variant === "energy_usage") {
    if (model === "light") {
      return `If ${n} people did the same, that's ${formatWh(scaledDeltaEnergyWh)} saved per 1,000 tokens each.`;
    }
    return `If ${n} people did the same, that's ${formatWh(scaledHeavyEnergyWh)} used per 1,000 tokens each.`;
  }
  return null;
}

export function ModelPicker(props: {
  selected: ModelKey;
  onChange: (model: ModelKey) => void;
  infoVariant: InfoVariant;
  modelComparison: ModelComparison;
  /** Set once a "fixed" plan has been paid for -- the toggle becomes a plain label instead of switchable buttons. */
  locked?: boolean;
}) {
  const { selected, onChange, infoVariant, modelComparison, locked } = props;
  const showCaptions = infoVariant === "environmental" || infoVariant === "energy_usage";

  const lightCaption = showCaptions ? modelCaption(infoVariant, "light", modelComparison) : null;
  const heavyCaption = showCaptions ? modelCaption(infoVariant, "heavy", modelComparison) : null;

  return (
    <div className="model-picker-bar">
      <div className="model-picker">
        {locked ? (
          <div className="locked-plan-label">
            Your plan: <b>{selected === "heavy" ? "Heavy" : "Light"}</b> (locked for this session)
          </div>
        ) : (
          <div className="model-toggle-group">
            <button className={selected === "light" ? "active" : ""} onClick={() => onChange("light")}>
              Light model
            </button>
            <button className={selected === "heavy" ? "active" : ""} onClick={() => onChange("heavy")}>
              Heavy model
            </button>
          </div>
        )}
      </div>

      {showCaptions && !locked && (
        <div className="model-caption-row">
          <div className="model-caption">
            <strong>Light model</strong>
            {lightCaption}
          </div>
          <div className="model-caption">
            <strong>Heavy model</strong>
            {heavyCaption}
          </div>
        </div>
      )}
    </div>
  );
}
