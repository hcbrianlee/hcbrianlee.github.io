"use client";

import { formatCents } from "@/lib/format";
import type { CopyBlock, ModelKey } from "@/lib/types";

export function FixedPlanPicker(props: {
  options: { heavy: number; light: number };
  fixedCreditCents: number;
  infoCopy: CopyBlock | null;
  submitting: boolean;
  onSelect: (model: ModelKey) => void;
}) {
  const { options, fixedCreditCents, infoCopy, submitting, onSelect } = props;

  return (
    <div className="plan-picker">
      <h2>Choose your model for this session</h2>
      <p>
        This condition charges a flat, one-time price instead of per-message pricing. Pick heavy or light now — that
        choice covers every message for the rest of this session, charged once from your {formatCents(fixedCreditCents)}{" "}
        participation credit.
      </p>

      {infoCopy && (
        <div className="nudge-block info plan-picker-nudge">
          <strong>{infoCopy.title}</strong>
          {infoCopy.body}
        </div>
      )}

      <div className="plan-options">
        <button className="plan-option" disabled={submitting} onClick={() => onSelect("heavy")}>
          <span className="plan-option-label">Heavy</span>
          <span className="plan-option-price">{formatCents(options.heavy)}</span>
          <span className="plan-option-desc">Higher-power model, generally higher quality.</span>
        </button>
        <button className="plan-option" disabled={submitting} onClick={() => onSelect("light")}>
          <span className="plan-option-label">Light</span>
          <span className="plan-option-price">{formatCents(options.light)}</span>
          <span className="plan-option-desc">Faster, lower energy use per response.</span>
        </button>
      </div>

      {submitting && <p className="plan-picker-status">Setting up your plan…</p>}
    </div>
  );
}
