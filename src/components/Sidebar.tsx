"use client";

import type { CopyBlock, CumulativeUsage, InfoVariant, PricingVariant } from "@/lib/types";
import { formatGrams, formatUserCount, formatMiles } from "@/lib/format";
import { milesFromCo2G } from "@/lib/carbon";

export function Sidebar(props: {
  cumulative: CumulativeUsage;
  /** Hypothetical group size for the "if everyone on this platform did what you've done" CO2 framing -- same figure used in ModelPicker's per-model comparison (session.modelComparison.scaleUsers). */
  scaleUsers: number;
  pricingCopy: CopyBlock | null;
  infoVariant: InfoVariant;
  pricingVariant: PricingVariant;
  onNewChat: () => void;
}) {
  const { cumulative, scaleUsers, pricingCopy, infoVariant, pricingVariant, onNewChat } = props;

  const showCo2 = infoVariant === "environmental" || infoVariant === "environmental_token";
  // Raw "Tokens used" count (no denominator, for either pricing variant) --
  // only for the "token" info conditions, since it's the informational nudge
  // itself, not a budget disclosure.
  const showTokenUsage = infoVariant === "token" || infoVariant === "environmental_token";
  // The token cap is enforced server-side for BOTH pricing variants (see
  // chat/route.ts), but only disclosed as a standing "Token limit: 10,000"
  // note for "variable" sessions -- shown for ALL variable conditions
  // regardless of info variant, since it's a real constraint participants
  // need to know about, independent of the informational nudge. "flat"
  // never discloses it, so it still reads as "unlimited" the way the
  // condition is framed.
  const showTokenLimitNote = pricingVariant === "variable";

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
          <div className="sidebar-pricing-note">
            🌍 If <strong>{formatUserCount(scaleUsers)}</strong> people each used what you have, that&apos;s{" "}
            <strong>{formatGrams(cumulative.co2G * scaleUsers)}</strong> of CO₂ -- like driving{" "}
            <strong>{formatMiles(milesFromCo2G(cumulative.co2G * scaleUsers))}</strong>.
          </div>
        )}

        {showTokenUsage && (
          <div className="stat-row">
            <span className="stat-label">Tokens used</span>
            <span>{cumulative.totalTokens.toLocaleString()}</span>
          </div>
        )}

        {showTokenLimitNote && pricingCopy && (
          <div className="sidebar-pricing-note">
            <strong>{pricingCopy.title}</strong>
            {pricingCopy.body}
          </div>
        )}
      </div>

      <div className="sidebar-spacer" />
    </aside>
  );
}
