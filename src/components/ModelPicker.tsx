"use client";

import { useState } from "react";
import type { CopyBlock, ModelKey } from "@/lib/types";

export function ModelPicker(props: {
  selected: ModelKey;
  onChange: (model: ModelKey) => void;
  infoCopy: CopyBlock | null;
  pricingCopy: CopyBlock;
}) {
  const { selected, onChange, infoCopy, pricingCopy } = props;
  const [showNudge, setShowNudge] = useState(true);

  return (
    <>
      <div className="header-bar">
        <div className="model-picker">
          <div className="model-toggle-group">
            <button className={selected === "light" ? "active" : ""} onClick={() => onChange("light")}>
              Light model
            </button>
            <button className={selected === "heavy" ? "active" : ""} onClick={() => onChange("heavy")}>
              Heavy model
            </button>
          </div>
          {(infoCopy || pricingCopy) && (
            <button
              className="nudge-toggle"
              aria-label="Toggle model info"
              onClick={() => setShowNudge((v) => !v)}
              title="Model info"
            >
              ℹ
            </button>
          )}
        </div>
      </div>

      {showNudge && (
        <div className="nudge-panel">
          {infoCopy && (
            <div className="nudge-block info">
              <strong>{infoCopy.title}</strong>
              {infoCopy.body}
            </div>
          )}
          <div className="nudge-block pricing">
            <strong>{pricingCopy.title}</strong>
            {pricingCopy.body}
          </div>
        </div>
      )}
    </>
  );
}
