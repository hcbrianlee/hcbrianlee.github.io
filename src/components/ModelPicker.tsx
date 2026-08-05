"use client";

import type { InfoVariant, ModelComparison, ModelKey } from "@/lib/types";
import { formatGrams, formatMlPrecise, formatUserCount, formatWh } from "@/lib/format";

// "900 million" references OpenAI's own reported ChatGPT weekly-active-user
// figure -- explicitly attributed to ChatGPT, not this app, since this
// prototype obviously doesn't have that many users. Framing it as "our
// platform's users" would be a false claim to participants; framing it as
// "if ChatGPT's weekly users did this" keeps the same scale/impact honestly.
function modelCaption(variant: InfoVariant, model: ModelKey, comparison: ModelComparison): string | null {
  const n = comparison.scaleUsers;
  const nDisplay = formatUserCount(n);
  // Per-token, not per-1,000 -- comparison.* fields are per-1,000-tokens.
  const scaledDeltaEnergyWh = (comparison.deltaEnergyWh / 1000) * n;
  const scaledHeavyEnergyWh = (comparison.heavy.energyWh / 1000) * n;
  const scaledDeltaCo2G = (comparison.deltaCo2G / 1000) * n;
  const scaledDeltaWaterMl = (comparison.deltaWaterMl / 1000) * n;
  const lead = `If everyone who uses ChatGPT weekly (${nDisplay} people!) did the same`;

  if (variant === "environmental") {
    if (model === "light") {
      return `${lead}, that's ${formatWh(scaledDeltaEnergyWh)} saved, along with ${formatGrams(scaledDeltaCo2G)} less CO₂ and ${formatMlPrecise(scaledDeltaWaterMl)} less water, per token.`;
    }
    return `${lead}, that's ${formatWh(scaledHeavyEnergyWh)} used, leading to ${formatGrams(scaledDeltaCo2G)} more CO₂ and ${formatMlPrecise(scaledDeltaWaterMl)} more water, per token.`;
  }
  if (variant === "energy_usage") {
    if (model === "light") {
      return `${lead}, that's ${formatWh(scaledDeltaEnergyWh)} saved per token.`;
    }
    return `${lead}, that's ${formatWh(scaledHeavyEnergyWh)} used per token.`;
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
