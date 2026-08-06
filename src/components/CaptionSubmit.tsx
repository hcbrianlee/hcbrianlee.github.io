"use client";

import { useState } from "react";
import type { CaptionSubmission } from "@/lib/types";

export function CaptionSubmit(props: {
  submissions: CaptionSubmission[];
  maxSubmissions: number;
  submitting: boolean;
  onSubmit: (captionText: string) => void;
}) {
  const { submissions, maxSubmissions, submitting, onSubmit } = props;
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
    <div className="caption-submit-panel">
      {submissions.length > 0 && (
        <div className="caption-submitted-list">
          <span className="caption-submitted-label">
            Your submitted captions ({submissions.length}/{maxSubmissions})
          </span>
          {submissions.map((s, i) => (
            <div className="caption-submitted-item" key={s.submittedAt}>
              <span className="caption-submitted-index">{i + 1}.</span>
              <p>&ldquo;{s.text}&rdquo;</p>
              <span className="caption-submitted-time">{new Date(s.submittedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {atLimit ? (
        <p className="caption-submit-limit">
          You&apos;ve submitted the maximum of {maxSubmissions} caption ideas.
        </p>
      ) : !expanded ? (
        <button className="caption-reveal-btn" onClick={() => setExpanded(true)}>
          {submissions.length > 0 ? "✍️ Add another caption idea" : "✍️ Ready? Write your final caption"}
        </button>
      ) : (
        <div className="caption-form">
          <label htmlFor="caption-input">
            {submissions.length > 0 ? "Another caption idea for this cartoon" : "Your caption for this cartoon"}
          </label>
          <textarea
            id="caption-input"
            rows={2}
            autoFocus
            placeholder="Write your caption idea here, then submit it..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
          />
          <button className="caption-submit-btn" disabled={!draft.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "Submit caption"}
          </button>
        </div>
      )}
    </div>
  );
}
