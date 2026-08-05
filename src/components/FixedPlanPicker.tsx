"use client";

import { modelCaption } from "@/components/ModelPicker";
import { formatCents } from "@/lib/format";
import type { CopyBlock, InfoVariant, ModelComparison, ModelKey } from "@/lib/types";

export function FixedPlanPicker(props: {
  options: { heavy: number; light: number };
  fixedCreditCents: number;
  infoVariant: InfoVariant;
  infoCopy: CopyBlock | null;
  modelComparison: ModelComparison;
  submitting: boolean;
  onSelect: (model: ModelKey) => void;
}) {
  const { options, fixedCreditCents, infoVariant, infoCopy, modelComparison, submitting, onSelect } = props;
  const showCaptions = infoVariant === "environmental" || infoVariant === "energy_usage";
  const heavyCaption = showCaptions ? modelCaption(infoVariant, "heavy", modelComparison) : null;
  const lightCaption = showCaptions ? modelCaption(infoVariant, "light", modelComparison) : null;

  return (
    <div className="plan-picker">
      <h2>Choose your model for this session</h2>
      <div className="chat-nudge plan-picker-task">
        🏆 A panel of judges will rate captions for funniness — the caption with the most votes wins $100.
      </div>
      <p>
        This condition charges a flat, one-time price instead of per-message pricing. Pick heavy or light now — that
        choice covers every message for the rest of this session, charged once from your {formatCents(fixedCreditCents)}{" "}
        participation credit.
      </p>

      {!showCaptions && infoCopy && (
        <div className="nudge-block info plan-picker-nudge">
          <strong>{infoCopy.title}</strong>
          {infoCopy.body}
        </div>
      )}

      <div className="plan-options">
        <button className="plan-option" disabled={submitting} onClick={() => onSelect("heavy")}>
          <span className="plan-option-label">Heavy</span>
          <span className="plan-option-price">{formatCents(options.heavy)}</span>
          <span className="plan-option-desc">{heavyCaption ?? "Higher-power model, generally higher quality."}</span>
        </button>
        <button className="plan-option" disabled={submitting} onClick={() => onSelect("light")}>
          <span className="plan-option-label">Light</span>
          <span className="plan-option-price">{formatCents(options.light)}</span>
          <span className="plan-option-desc">{lightCaption ?? "Faster, lower energy use per response."}</span>
        </button>
      </div>

      {submitting && <p className="plan-picker-status">Setting up your plan…</p>}
    </div>
  );
}
