"use client";

import { modelCaption } from "@/components/ModelPicker";
import { formatCents } from "@/lib/format";
import type { ActiveTask, CopyBlock, InfoVariant, ModelComparison, ModelKey } from "@/lib/types";

const TASK_BLURB: Record<ActiveTask, string> = {
  cartoon: "🏆 A panel of judges will rate captions for funniness — the caption with the most votes wins $100.",
  scheduling:
    "🏆 Assign each of the 6 speakers to a time slot so every constraint is satisfied — solve it as fast as you can.",
  staffScheduling:
    "🧩 This week's staffing puzzle, as written, has no valid solution. You'll need to figure out which rule is " +
    "the real blocker, decide whether to relax it, explain your reasoning, and submit a schedule that satisfies " +
    "everything else — a human judge reviews your schedule, the rule you relaxed, and your rationale afterward.",
  adCaption: "📣 Write an ad caption for a product — a human judge reviews submissions afterward, no auto-grading.",
  negotiation:
    "🤝 Chat with the AI to develop a negotiation strategy, then submit your final memo — a human judge reviews " +
    "it afterward against private information only you had access to.",
};

export function FixedPlanPicker(props: {
  options: { heavy: number; light: number };
  fixedCreditCents: number;
  activeTask: ActiveTask;
  infoVariant: InfoVariant;
  infoCopy: CopyBlock | null;
  modelComparison: ModelComparison;
  submitting: boolean;
  onSelect: (model: ModelKey) => void;
}) {
  const { options, fixedCreditCents, activeTask, infoVariant, infoCopy, modelComparison, submitting, onSelect } =
    props;
  const showCaptions = infoVariant === "environmental" || infoVariant === "energy_usage" || infoVariant === "convenience";
  const heavyCaption = showCaptions ? modelCaption(infoVariant, "heavy", modelComparison) : null;
  const lightCaption = showCaptions ? modelCaption(infoVariant, "light", modelComparison) : null;

  return (
    <div className="plan-picker">
      <h2>Choose your model for this session</h2>
      <div className="chat-nudge plan-picker-task">{TASK_BLURB[activeTask]}</div>
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
