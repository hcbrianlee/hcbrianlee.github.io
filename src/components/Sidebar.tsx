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
  /**
   * Below the 720px breakpoint (see globals.css) the sidebar is a slide-in
   * drawer instead of a permanent column -- `open` toggles the
   * open/closed CSS state and `onClose` is wired to both the drawer's own
   * close button and the backdrop overlay rendered by the parent (page.tsx).
   * Has no visual effect above the breakpoint, where the sidebar is always
   * shown and these are unused.
   */
  open: boolean;
  onClose: () => void;
}) {
  const { cumulative, scaleUsers, pricingCopy, infoVariant, pricingVariant, onNewChat, open, onClose } = props;

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
    <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        🌱 Green Nudge Chat
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>
      </div>

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
