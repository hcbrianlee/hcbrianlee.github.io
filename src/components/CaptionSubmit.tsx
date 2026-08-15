"use client";

import { useState } from "react";
import type { CaptionSubmission } from "@/lib/types";

export function CaptionSubmit(props: {
  submissions: CaptionSubmission[];
  maxSubmissions: number;
  submitting: boolean;
  onSubmit: (captionText: string) => void;
  /** What the caption is for, e.g. "this cartoon" (default) or "this product". */
  subjectLabel?: string;
  /** Singular item name, e.g. "caption" (default) or "ad caption". */
  itemLabel?: string;
}) {
  const { submissions, maxSubmissions, submitting, onSubmit } = props;
  const subjectLabel = props.subjectLabel ?? "this cartoon";
  const itemLabel = props.itemLabel ?? "caption";
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
            Your submitted {itemLabel}s ({submissions.length}/{maxSubmissions})
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
          You&apos;ve submitted the maximum of {maxSubmissions} {itemLabel} ideas.
        </p>
      ) : !expanded ? (
        <button className="caption-reveal-btn" onClick={() => setExpanded(true)}>
          {submissions.length > 0 ? `✍️ Add another ${itemLabel} idea` : `✍️ Ready? Write your final ${itemLabel}`}
        </button>
      ) : (
        <div className="caption-form">
          <label htmlFor="caption-input">
            {submissions.length > 0 ? `Another ${itemLabel} idea for ${subjectLabel}` : `Your ${itemLabel} for ${subjectLabel}`}
          </label>
          <textarea
            id="caption-input"
            rows={2}
            autoFocus
            placeholder={`Write your ${itemLabel} idea here, then submit it...`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
          />
          <button className="caption-submit-btn" disabled={!draft.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : `Submit ${itemLabel}`}
          </button>
        </div>
      )}
    </div>
  );
}
