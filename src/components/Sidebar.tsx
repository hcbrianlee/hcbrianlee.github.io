"use client";

import type { CopyBlock, CumulativeUsage, InfoVariant, PricingVariant } from "@/lib/types";
import { formatGrams, formatUserCount, formatMiles } from "@/lib/format";
import { milesFromCo2G } from "@/lib/carbon";

export function Sidebar(props: {
  cumulative: CumulativeUsage;
  socialProofPct: number | null;
  maxTokensPerSession: number;
  /** Hypothetical group size for the "if everyone on this platform did what you've done" CO2 framing -- same figure used in ModelPicker's per-model comparison (session.modelComparison.scaleUsers). */
  scaleUsers: number;
  pricingCopy: CopyBlock | null;
  infoVariant: InfoVariant;
  pricingVariant: PricingVariant;
  onNewChat: () => void;
}) {
  const { cumulative, socialProofPct, maxTokensPerSession, scaleUsers, pricingCopy, infoVariant, pricingVariant, onNewChat } =
    props;

  const showCo2 = infoVariant === "environmental" || infoVariant === "environmental_token";
  const showTokens = infoVariant === "token" || infoVariant === "environmental_token";
  // The token cap is enforced server-side for BOTH pricing variants (see
  // chat/route.ts), but only disclosed to "variable" sessions -- "flat"
  // shows just the raw count, no denominator and no limit note, so it
  // still reads as "unlimited" the way the condition is framed.
  const showCap = pricingVariant === "variable";

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
            🌍 If everyone on this platform used what you have (we have <strong>{formatUserCount(scaleUsers)}</strong>{" "}
            people!), that&apos;s <strong>{formatGrams(cumulative.co2G * scaleUsers)}</strong> of CO₂ -- like driving{" "}
            <strong>{formatMiles(milesFromCo2G(cumulative.co2G * scaleUsers))}</strong>.
          </div>
        )}

        {showTokens && (
          <>
            <div className="stat-row">
              <span className="stat-label">Tokens used</span>
              <span>
                {showCap
                  ? `${cumulative.totalTokens.toLocaleString()} / ${maxTokensPerSession.toLocaleString()}`
                  : cumulative.totalTokens.toLocaleString()}
              </span>
            </div>
            {showCap && pricingCopy && (
              <div className="sidebar-pricing-note">
                <strong>{pricingCopy.title}</strong>
                {pricingCopy.body}
              </div>
            )}
          </>
        )}

        {socialProofPct !== null && (
          <div className="social-proof">🌿 {socialProofPct}% of responses so far used the light model.</div>
        )}
      </div>

      <div className="sidebar-spacer" />
    </aside>
  );
}
