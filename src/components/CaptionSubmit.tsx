"use client";

import { useState } from "react";

export function CaptionSubmit(props: {
  finalCaption: string | null;
  finalCaptionSubmittedAt: string | null;
  submitting: boolean;
  onSubmit: (captionText: string) => void;
}) {
  const { finalCaption, finalCaptionSubmittedAt, submitting, onSubmit } = props;
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");

  if (finalCaption) {
    return (
      <div className="caption-submit-panel">
        <div className="caption-submitted">
          <span className="caption-submitted-label">Your submitted caption</span>
          <p>&ldquo;{finalCaption}&rdquo;</p>
          {finalCaptionSubmittedAt && (
            <span className="caption-submitted-time">
              Submitted {new Date(finalCaptionSubmittedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="caption-submit-panel">
        <button className="caption-reveal-btn" onClick={() => setExpanded(true)}>
          ✍️ Ready? Write your final caption
        </button>
      </div>
    );
  }

  return (
    <div className="caption-submit-panel">
      <div className="caption-form">
        <label htmlFor="caption-input">Your final caption for this cartoon</label>
        <textarea
          id="caption-input"
          rows={2}
          autoFocus
          placeholder="Write your best caption here, then submit it..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
        />
        <button
          className="caption-submit-btn"
          disabled={!draft.trim() || submitting}
          onClick={() => onSubmit(draft.trim())}
        >
          {submitting ? "Submitting..." : "Submit caption"}
        </button>
      </div>
    </div>
  );
}
