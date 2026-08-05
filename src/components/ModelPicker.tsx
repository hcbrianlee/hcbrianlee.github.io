"use client";

import type { InfoVariant, ModelComparison, ModelKey } from "@/lib/types";
import { formatGrams, formatMlPrecise, formatWh } from "@/lib/format";

function modelCaption(variant: InfoVariant, model: ModelKey, comparison: ModelComparison): string | null {
  if (variant === "environmental") {
    if (model === "light") {
      return `Save ${formatWh(comparison.deltaEnergyWh)}, which leads to ${formatGrams(comparison.deltaCo2G)} less CO₂ and ${formatMlPrecise(comparison.deltaWaterMl)} less water per 1,000 tokens.`;
    }
    return `Consumes ${formatWh(comparison.heavy.energyWh)}, which leads to ${formatGrams(comparison.deltaCo2G)} more CO₂ and ${formatMlPrecise(comparison.deltaWaterMl)} more water per 1,000 tokens.`;
  }
  if (variant === "energy_usage") {
    if (model === "light") {
      return `Saves ${formatWh(comparison.deltaEnergyWh)} per 1,000 tokens.`;
    }
    return `Consumes ${formatWh(comparison.heavy.energyWh)} per 1,000 tokens.`;
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
