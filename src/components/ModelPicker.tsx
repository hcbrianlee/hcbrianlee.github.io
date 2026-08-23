"use client";

import type { ReactNode } from "react";
import type { InfoVariant, ModelKey } from "@/lib/types";
import { formatGrams } from "@/lib/format";

export interface AvgResponseImpact {
  heavy: { tokens: number; co2G: number };
  light: { tokens: number; co2G: number };
}

/**
 * "token" -> average tokens per response only. "environmental" -> average
 * CO2 per response only. "environmental_token" -> both. "none" -> nothing.
 * All from real, platform-wide averages (SessionInfo.avgResponseImpact,
 * computed server-side -- see src/lib/session.ts getAverageTokensPerModel),
 * not the earlier "if everyone did this" scaled hypothetical.
 */
export function modelCaption(variant: InfoVariant, model: ModelKey, avg: AvgResponseImpact): ReactNode {
  const stats = avg[model];
  const showTokens = variant === "token" || variant === "environmental_token";
  const showCo2 = variant === "environmental" || variant === "environmental_token";

  if (!showTokens && !showCo2) return null;

  return (
    <>
      {showTokens && (
        <>
          ~<strong>{Math.round(stats.tokens).toLocaleString()}</strong> tokens
        </>
      )}
      {showTokens && showCo2 && " and "}
      {showCo2 && (
        <>
          ~<strong>{formatGrams(stats.co2G)}</strong> CO₂
        </>
      )}{" "}
      per response, on average.
    </>
  );
}

export function ModelPicker(props: {
  selected: ModelKey;
  onChange: (model: ModelKey) => void;
  infoVariant: InfoVariant;
  avgResponseImpact: AvgResponseImpact;
}) {
  const { selected, onChange, infoVariant, avgResponseImpact } = props;
  const showCaptions = infoVariant !== "none";

  if (showCaptions) {
    const lightCaption = modelCaption(infoVariant, "light", avgResponseImpact);
    const heavyCaption = modelCaption(infoVariant, "heavy", avgResponseImpact);
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
