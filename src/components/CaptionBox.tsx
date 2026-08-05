"use client";

import { useState } from "react";

export function CaptionBox(props: {
  cartoonImageUrl: string;
  finalCaption: string | null;
  submitting: boolean;
  onSubmit: (captionText: string) => void;
}) {
  const { cartoonImageUrl, finalCaption, submitting, onSubmit } = props;
  const [draft, setDraft] = useState("");

  return (
    <div className="caption-panel">
      <img
        className="cartoon-image"
        src={cartoonImageUrl}
        alt="New Yorker Cartoon Caption Contest cartoon to write a caption for"
        loading="lazy"
      />

      {finalCaption ? (
        <div className="caption-submitted">
          <span className="caption-submitted-label">Your submitted caption</span>
          <p>&ldquo;{finalCaption}&rdquo;</p>
        </div>
      ) : (
        <div className="caption-form">
          <label htmlFor="caption-input">Your final caption for this cartoon</label>
          <textarea
            id="caption-input"
            rows={2}
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
      )}
    </div>
  );
}
