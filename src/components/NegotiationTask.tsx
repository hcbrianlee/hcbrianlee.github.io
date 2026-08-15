"use client";

import { useState } from "react";
import { NEGOTIATION_SCENARIO } from "@/lib/negotiation";
import type { CaptionSubmission } from "@/lib/types";

export function NegotiationTask(props: {
  submissions: CaptionSubmission[];
  maxSubmissions: number;
  submitting: boolean;
  onSubmit: (memoText: string) => void;
}) {
  const { submissions, maxSubmissions, submitting, onSubmit } = props;
  const [showPrivateFacts, setShowPrivateFacts] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const atLimit = submissions.length >= maxSubmissions;

  function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    onSubmit(text);
    setDraft("");
  }

  return (
    <div className="scheduling-panel">
      <div className="chat-nudge">
        🤝 Chat with the AI to develop a negotiation strategy. It only knows what you actually tell it -- deciding
        what to share, when, and how much of the draft to trust is on you. When you&apos;re ready, write your final
        strategy memo below and submit it for review.
      </div>

      <div className="scheduling-constraints">
        <strong>{NEGOTIATION_SCENARIO.title}</strong>
        <p style={{ margin: "0 0 10px" }}>{NEGOTIATION_SCENARIO.publicBrief}</p>

        <button type="button" className="admin-reset-btn" onClick={() => setShowPrivateFacts((v) => !v)}>
          {showPrivateFacts ? "Hide" : "Show"} your private facts (never sent to the AI automatically)
        </button>

        {showPrivateFacts && (
          <ul className="staff-background-list" style={{ marginTop: 10 }}>
            {NEGOTIATION_SCENARIO.privateFacts.map((fact) => (
              <li key={fact}>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {submissions.length > 0 && (
        <div className="caption-submitted-list">
          <span className="caption-submitted-label">
            Your submitted memos ({submissions.length}/{maxSubmissions})
          </span>
          {submissions.map((s, i) => (
            <div className="caption-submitted-item" key={s.submittedAt}>
              <span className="caption-submitted-index">{i + 1}.</span>
              <p style={{ whiteSpace: "pre-wrap" }}>{s.text}</p>
              <span className="caption-submitted-time">{new Date(s.submittedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {atLimit ? (
        <p className="caption-submit-limit">You&apos;ve submitted the maximum of {maxSubmissions} memos.</p>
      ) : !expanded ? (
        <button className="caption-reveal-btn" onClick={() => setExpanded(true)}>
          {submissions.length > 0 ? "✍️ Submit a revised memo" : "✍️ Ready? Write your negotiation strategy memo"}
        </button>
      ) : (
        <div className="caption-form">
          <label htmlFor="negotiation-input">Your negotiation strategy memo</label>
          <textarea
            id="negotiation-input"
            rows={10}
            autoFocus
            placeholder="Write your final negotiation strategy here, then submit it..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={6000}
          />
          <button className="caption-submit-btn" disabled={!draft.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "Submit memo"}
          </button>
        </div>
      )}
    </div>
  );
}
