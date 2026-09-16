"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ModelPicker } from "./ModelPicker";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { formatGrams, formatMiles } from "@/lib/format";
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

  // Draggable FAB -- on a small/mobile screen the default bottom-right spot
  // can land right on top of a task's own Submit button, and there's no
  // single default position that avoids every task layout. Letting the
  // participant drag it out of the way covers all of them instead of
  // guessing one fixed spot. `fabPos` is null until the first drag (meaning
  // "use the default bottom-right CSS position"); once set, it's an
  // absolute viewport position that overrides that default.
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; dragging: boolean } | null>(
    null
  );
  const suppressClickRef = useRef(false);
  const [fabPos, setFabPos] = useState<{ left: number; top: number } | null>(null);

  // Re-clamp a dragged position after a resize/orientation change so the
  // button can't end up stranded off-screen (e.g. dragged near the right
  // edge in landscape, then the phone is rotated back to portrait).
  useEffect(() => {
    function handleResize() {
      setFabPos((prev) => (prev ? clampFabPosition(prev, fabRef.current) : prev));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function clampFabPosition(pos: { left: number; top: number }, btn: HTMLButtonElement | null) {
    const width = btn?.offsetWidth ?? 56;
    const height = btn?.offsetHeight ?? 56;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return { left: Math.min(Math.max(pos.left, 8), maxLeft), top: Math.min(Math.max(pos.top, 8), maxTop) };
  }

  function handleFabPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    const btn = fabRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top, dragging: false };
    btn.setPointerCapture(e.pointerId);
  }

  function handleFabPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    // Below this threshold, treat it as a still-pending tap rather than a
    // drag -- avoids every ordinary click jittering the button by a pixel.
    if (!drag.dragging && Math.hypot(dx, dy) < 6) return;
    drag.dragging = true;
    setFabPos(clampFabPosition({ left: drag.startLeft + dx, top: drag.startTop + dy }, fabRef.current));
  }

  function handleFabPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    fabRef.current?.releasePointerCapture(e.pointerId);
    // A drag ending fires a synthetic click right after -- suppress just
    // that one so dropping the button doesn't also toggle the chat open.
    if (drag?.dragging) suppressClickRef.current = true;
  }

  function handleFabClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen((o) => !o);
  }

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
  // V0/F0 (infoVariant "none") keep the original above-the-input placement
  // unchanged -- there's nothing (F0) or just the bare token-limit note
  // (V0) to show, not worth a whole separate panel for. Every other
  // condition has real nudge content (a CO2 note, a tokens-used stat, or
  // both), which now gets its own panel next to the chatbox instead of
  // sitting above the input.
  const hasNudgeInfo = infoVariant !== "none";

  const nudgeBlock = (
    <>
      <h3>Your usage this session</h3>
      <div className="chat-nudge-stat-row">
        <span className="chat-nudge-stat-label">Prompts sent</span>
        <span>{cumulative.promptCount}</span>
      </div>

      {showCo2 && (
        <div className="chat-nudge-note">
          🌍 If all the participants used what you have (and we have <strong>{scaleUsers.toLocaleString()}</strong>
          ), that&apos;s <strong>{formatGrams(cumulative.co2G * scaleUsers)}</strong> of CO₂ -- like driving{" "}
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
    </>
  );

  const budgetExhaustedMessage =
    pricingVariant === "variable" && cumulative.spentCents >= session.fixedCreditCents
      ? "You've used your full participation credit for this session"
      : `You've reached the ${session.maxTokensPerSession.toLocaleString()}-token limit for this session`;

  return (
    <>
      <button
        ref={fabRef}
        className="chat-fab"
        style={fabPos ? { left: fabPos.left, top: fabPos.top, right: "auto", bottom: "auto" } : undefined}
        onPointerDown={handleFabPointerDown}
        onPointerMove={handleFabPointerMove}
        onPointerUp={handleFabPointerUp}
        onPointerCancel={handleFabPointerUp}
        onClick={handleFabClick}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "✕" : <>💬 AI Assistant</>}
      </button>

      {open && (
        <div className="chat-widget-row">
          {hasNudgeInfo && !minimized && <div className="chat-panel-nudges chat-nudge-panel">{nudgeBlock}</div>}

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
                {!hasNudgeInfo && <div className="chat-panel-nudges">{nudgeBlock}</div>}

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
