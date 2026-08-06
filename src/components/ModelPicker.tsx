"use client";

import type { ReactNode } from "react";
import type { InfoVariant, ModelComparison, ModelKey } from "@/lib/types";
import { formatGrams, formatMlPrecise, formatUserCount, formatWh } from "@/lib/format";

// "900 million" is OpenAI's own reported ChatGPT weekly-active-user figure,
// used here as the hypothetical group size in the "if everyone did this"
// framing. Note this app itself does not have 900 million users -- this
// number is illustrative scale-of-impact copy, not a factual claim about
// this platform's actual usage.
export function modelCaption(variant: InfoVariant, model: ModelKey, comparison: ModelComparison): ReactNode {
  const n = comparison.scaleUsers;
  const nDisplay = formatUserCount(n);
  // Per-token, not per-1,000 -- comparison.* fields are per-1,000-tokens.
  const scaledDeltaEnergyWh = (comparison.deltaEnergyWh / 1000) * n;
  const scaledHeavyEnergyWh = (comparison.heavy.energyWh / 1000) * n;
  const scaledDeltaCo2G = (comparison.deltaCo2G / 1000) * n;
  const scaledDeltaWaterMl = (comparison.deltaWaterMl / 1000) * n;
  const lead = (
    <>
      If everyone on this platform did the same (we have <strong>{nDisplay}</strong> people!)
    </>
  );

  if (variant === "environmental") {
    if (model === "light") {
      return (
        <>
          {lead}, that&apos;s <strong>{formatWh(scaledDeltaEnergyWh)}</strong> saved, along with{" "}
          <strong>{formatGrams(scaledDeltaCo2G)}</strong> less CO₂ and <strong>{formatMlPrecise(scaledDeltaWaterMl)}</strong>{" "}
          less water, per token.
        </>
      );
    }
    return (
      <>
        {lead}, that&apos;s <strong>{formatWh(scaledHeavyEnergyWh)}</strong> used, leading to{" "}
        <strong>{formatGrams(scaledDeltaCo2G)}</strong> more CO₂ and <strong>{formatMlPrecise(scaledDeltaWaterMl)}</strong>{" "}
        more water, per token.
      </>
    );
  }
  if (variant === "energy_usage") {
    if (model === "light") {
      return (
        <>
          {lead}, that&apos;s <strong>{formatWh(scaledDeltaEnergyWh)}</strong> saved per token.
        </>
      );
    }
    return (
      <>
        {lead}, that&apos;s <strong>{formatWh(scaledHeavyEnergyWh)}</strong> used per token.
      </>
    );
  }
  if (variant === "convenience") {
    if (model === "light") {
      return (
        <>
          Gives <strong>{comparison.lightSuggestionCount}</strong> caption suggestions per response — faster, but
          about <strong>{Math.round(comparison.lightOffSuggestionProbability * 100)}%</strong> of the time, one of
          them may be a bit off.
        </>
      );
    }
    return (
      <>
        Gives <strong>{comparison.heavySuggestionCount}</strong> caption suggestions per response, consistently
        on-target — but takes noticeably longer to respond.
      </>
    );
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
  const showCaptions = infoVariant === "environmental" || infoVariant === "energy_usage" || infoVariant === "convenience";

  if (locked) {
    return (
      <div className="model-picker-bar">
        <div className="model-picker">
          <div className="locked-plan-label">
            Your plan: <b>{selected === "heavy" ? "Heavy" : "Light"}</b> (locked for this session)
          </div>
        </div>
      </div>
    );
  }

  if (showCaptions) {
    const lightCaption = modelCaption(infoVariant, "light", modelComparison);
    const heavyCaption = modelCaption(infoVariant, "heavy", modelComparison);
    return (
      <div className="model-picker-bar">
        <div className="model-toggle-cards">
          <button
            type="button"
            className={`model-toggle-card${selected === "light" ? " active" : ""}`}
            onClick={() => onChange("light")}
          >
            <strong>Light model</strong>
            <span>{lightCaption}</span>
          </button>
          <button
            type="button"
            className={`model-toggle-card${selected === "heavy" ? " active" : ""}`}
            onClick={() => onChange("heavy")}
          >
            <strong>Heavy model</strong>
            <span>{heavyCaption}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="model-picker-bar">
      <div className="model-picker">
        <div className="model-toggle-group">
          <button className={selected === "light" ? "active" : ""} onClick={() => onChange("light")}>
            Light model
          </button>
          <button className={selected === "heavy" ? "active" : ""} onClick={() => onChange("heavy")}>
            Heavy model
          </button>
        </div>
      </div>
    </div>
  );
}
