"use client";

import { useEffect, useState } from "react";
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
  const [minimized, setMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Shown only once a response has fully finished -- hidden the instant a
  // new message is sent (sending flips true immediately in page.tsx's
  // handleSend, before the request even goes out), so it never displays a
  // stale response while a new one is streaming in. Rendered as a
  // page-level overlay (outside the {open && ...} chat panel below), not
  // inside the chatbox, so it shows centered on the whole screen -- and
  // still appears even if the panel itself gets closed while a response
  // is in flight.
  const lastMessage = messages[messages.length - 1];
  const showOutputCard =
    !sending &&
    !dismissed &&
    lastMessage?.role === "assistant" &&
    !lastMessage.pending &&
    lastMessage.content.trim().length > 0;

  // A manual dismiss only applies to the response that was on screen when
  // it was clicked -- once a new message starts, un-dismiss so the next
  // finished response gets its own turn on screen.
  useEffect(() => {
    setDismissed(false);
  }, [lastMessage?.id]);

  async function handleCopyOutput() {
    if (!lastMessage) return;
    try {
      await navigator.clipboard.writeText(lastMessage.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context)
      // -- fail silently rather than showing an error for a copy button.
    }
  }

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
        <div className={`chat-panel${minimized ? " chat-panel-minimized" : ""}`}>
          <div className="chat-panel-header">
            <span className="chat-panel-title">🤖 Generative AI Assistant</span>
            <div className="chat-panel-header-actions">
              <button className="chat-panel-new-chat-btn" onClick={() => setHistoryOpen(true)} disabled={messages.length === 0}>
                History
              </button>
              <button className="chat-panel-new-chat-btn" onClick={onNewChat}>
                + New chat
              </button>
              <button
                className="chat-panel-close-btn"
                onClick={() => setMinimized((m) => !m)}
                aria-label={minimized ? "Restore chat" : "Minimize chat"}
              >
                {minimized ? "▢" : "−"}
              </button>
              <button className="chat-panel-close-btn" onClick={() => setOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>
          </div>

          {!minimized && (
            <>
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
              <div className="chat-composer-top">
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
                      <strong className="chat-nudge-note-title">{pricingCopy.title}</strong>
                      {pricingCopy.body}
                    </div>
                  )}
                </div>

                <ModelPicker
                  selected={selectedModel}
                  onChange={onModelChange}
                  infoVariant={infoVariant}
                  avgResponseImpact={session.avgResponseImpact}
                />
              </div>
            }
              />
            </>
          )}
        </div>
      )}

      {showOutputCard && (
        <div className="chat-output-overlay">
          <div className="chat-output-overlay-card">
            <div className="chat-output-float-header">
              <span>Latest response</span>
              <div className="chat-output-overlay-actions">
                <button className="chat-output-copy-btn" onClick={handleCopyOutput}>
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  className="chat-output-overlay-close-btn"
                  onClick={() => setDismissed(true)}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="chat-output-float-body">{lastMessage.content}</div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="chat-history-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="chat-history-card" onClick={(e) => e.stopPropagation()}>
            <div className="chat-history-card-header">
              <h2>Chat history</h2>
              <button className="chat-history-close-btn" onClick={() => setHistoryOpen(false)} aria-label="Close history">
                ✕
              </button>
            </div>
            <MessageList messages={messages} />
          </div>
        </div>
      )}
    </>
  );
}
