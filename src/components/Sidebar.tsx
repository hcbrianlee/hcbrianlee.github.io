"use client";

import type { CopyBlock, CumulativeUsage, InfoVariant, PricingVariant } from "@/lib/types";
import { formatCents, formatGrams } from "@/lib/format";

export function Sidebar(props: {
  cumulative: CumulativeUsage;
  socialProofPct: number | null;
  fixedCreditCents: number;
  pricingCopy: CopyBlock | null;
  infoVariant: InfoVariant;
  pricingVariant: PricingVariant;
  onNewChat: () => void;
}) {
  const { cumulative, socialProofPct, fixedCreditCents, pricingCopy, infoVariant, pricingVariant, onNewChat } = props;

  const showCo2 = infoVariant === "environmental" || infoVariant === "environmental_token";
  const showTokens = infoVariant === "token" || infoVariant === "environmental_token";
  const showBudget = pricingVariant === "variable";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">🌱 Green Nudge Chat</div>

      <button className="new-chat-btn" onClick={onNewChat}>
        + New chat
      </button>

      <div className="sidebar-section">
        <h3>Your usage this session</h3>
        <div className="stat-row">
          <span className="stat-label">Prompts sent</span>
          <span>{cumulative.promptCount}</span>
        </div>

        {showCo2 && (
          <div className="stat-row">
            <span className="stat-label">Est. CO₂ used</span>
            <span>{formatGrams(cumulative.co2G)}</span>
          </div>
        )}

        {showTokens && (
          <div className="stat-row">
            <span className="stat-label">Tokens used</span>
            <span>{cumulative.totalTokens.toLocaleString()}</span>
          </div>
        )}

        {socialProofPct !== null && (
          <div className="social-proof">🌿 {socialProofPct}% of responses so far used the light model.</div>
        )}
      </div>

      {showBudget && (
        <div className="sidebar-section">
          <h3>Participation credit</h3>
          <div className="stat-row">
            <span className="stat-label">Starting credit</span>
            <span>{formatCents(fixedCreditCents)}</span>
          </div>
          {cumulative.spentCents > 0 && (
            <div className="stat-row">
              <span className="stat-label">Spent so far</span>
              <span>{formatCents(cumulative.spentCents)}</span>
            </div>
          )}
          <div className="stat-row">
            <span className="stat-label">Remaining</span>
            <span>{formatCents(Math.max(0, fixedCreditCents - cumulative.spentCents))}</span>
          </div>

          {pricingCopy && (
            <div className="sidebar-pricing-note">
              <strong>{pricingCopy.title}</strong>
              {pricingCopy.body}
            </div>
          )}
        </div>
      )}

      <div className="sidebar-spacer" />
    </aside>
  );
}
