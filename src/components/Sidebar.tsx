"use client";

import type { CumulativeUsage } from "@/lib/types";
import { formatCents, formatGrams, formatMl } from "@/lib/format";

export function Sidebar(props: {
  cumulative: CumulativeUsage;
  socialProofPct: number | null;
  fixedCreditCents: number;
  sessionEnded: boolean;
  onNewChat: () => void;
  onDonateClick: () => void;
}) {
  const { cumulative, socialProofPct, fixedCreditCents, sessionEnded, onNewChat, onDonateClick } = props;

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
        <div className="stat-row">
          <span className="stat-label">Tokens used</span>
          <span>{cumulative.totalTokens.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Est. CO₂</span>
          <span>{formatGrams(cumulative.co2G)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Est. water</span>
          <span>{formatMl(cumulative.waterMl)}</span>
        </div>

        {socialProofPct !== null && (
          <div className="social-proof">🌿 {socialProofPct}% of responses so far used the light model.</div>
        )}
      </div>

      <div className="sidebar-section">
        <h3>Participation credit</h3>
        <div className="stat-row">
          <span className="stat-label">Fixed credit</span>
          <span>{formatCents(fixedCreditCents)}</span>
        </div>
      </div>

      <div className="sidebar-spacer" />

      <button className="donate-btn" onClick={onDonateClick} disabled={sessionEnded}>
        {sessionEnded ? "Session completed" : "Finish & Donate"}
      </button>
    </aside>
  );
}
