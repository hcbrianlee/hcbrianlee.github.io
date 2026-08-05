"use client";

import type { ModelKey } from "@/lib/types";

export function ModelPicker(props: {
  selected: ModelKey;
  onChange: (model: ModelKey) => void;
  /** Set once a "fixed" plan has been paid for -- the toggle becomes a plain label instead of switchable buttons. */
  locked?: boolean;
}) {
  const { selected, onChange, locked } = props;

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
    </div>
  );
}
