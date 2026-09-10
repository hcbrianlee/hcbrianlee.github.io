"use client";

import { useState } from "react";
import { ModelPicker } from "./ModelPicker";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { formatGrams, formatUserCount, formatMiles } from "@/lib/format";
import { milesFromCo2G } from "@/lib/carbon";
import type { ChatMessage, ModelKey, SessionInfo } from "@/lib/types";

/**
 * The AI assistant as an opt-in floating widget instead of a permanent part
 * of the page -- a floating button toggles a chat panel open/closed. All
 * the nudge content that used to live in the (now-retired) Sidebar --
 * prompts sent, the CO2 comparison, tokens used, the token-limit note --
 * moved in here too, since it's specifically about AI usage and only
 * meaningful once someone is actually using the assistant.
 */
export function FloatingChat(props: {
  session: SessionInfo;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  sessionEnded: boolean;
  selectedModel: ModelKey;
  onModelChange: (model: ModelKey) => void;
  onNewChat: () => void;
}) {
  const { session, messages, draft, onDraftChange, onSend, sending, sessionEnded, selectedModel, onModelChange, onNewChat } =
    props;
  const [open, setOpen] = useState(false);

  const { cumulative, condition, pricingCopy, modelComparison, budgetExhausted } = session;
  const { infoVariant, pricingVariant } = condition;
  const scaleUsers = modelComparison.scaleUsers;

  const showCo2 = infoVariant === "environmental" || infoVariant === "environmental_token";
  const showTokenUsage = infoVariant === "token" || infoVariant === "environmental_token";
  const showTokenLimitNote = pricingVariant === "variable";

  const budgetExhaustedMessage =
    pricingVariant === "variable" && cumulative.spentCents >= session.fixedCreditCents
      ? "You've used your full participation credit for this session"
      : `You've reached the ${session.maxTokensPerSession.toLocaleString()}-token limit for this session`;

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close chat" : "Open chat"}>
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span className="chat-panel-title">🌱 Green Nudge Chat</span>
            <div className="chat-panel-header-actions">
              <button className="chat-panel-new-chat-btn" onClick={onNewChat}>
                + New chat
              </button>
              <button className="chat-panel-close-btn" onClick={() => setOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>
          </div>

          <div className="chat-panel-nudges">
            <h3>Your usage this session</h3>
            <div className="chat-nudge-stat-row">
              <span className="chat-nudge-stat-label">Prompts sent</span>
              <span>{cumulative.promptCount}</span>
            </div>

            {showCo2 && (
              <div className="chat-nudge-note">
                🌍 If <strong>{formatUserCount(scaleUsers)}</strong> people each used what you have, that&apos;s{" "}
                <strong>{formatGrams(cumulative.co2G * scaleUsers)}</strong> of CO₂ -- like driving{" "}
                <strong>{formatMiles(milesFromCo2G(cumulative.co2G * scaleUsers))}</strong>.
              </div>
            )}

            {showTokenUsage && (
              <div className="chat-nudge-stat-row">
                <span className="chat-nudge-stat-label">Tokens used</span>
                <span>{cumulative.totalTokens.toLocaleString()}</span>
              </div>
            )}

            {showTokenLimitNote && pricingCopy && (
              <div className="chat-nudge-note">
                <strong>{pricingCopy.title}</strong>
                {pricingCopy.body}
              </div>
            )}
          </div>

          <MessageList messages={messages} />

          {budgetExhausted && (
            <div className="budget-exhausted-banner">
              {budgetExhaustedMessage} -- you can&apos;t send more messages, but you can still finish up the task
              below.
            </div>
          )}

          <Composer
            value={draft}
            onChange={onDraftChange}
            onSend={onSend}
            disabled={sending || sessionEnded || budgetExhausted}
            topContent={
              <ModelPicker
                selected={selectedModel}
                onChange={onModelChange}
                infoVariant={infoVariant}
                avgResponseImpact={session.avgResponseImpact}
              />
            }
          />
        </div>
      )}
    </>
  );
}
