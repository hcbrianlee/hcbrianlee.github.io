"use client";

import { useState } from "react";
import {
  EVENT_INFO,
  EVIDENCE_ITEMS,
  ATTENDEE_CONCERN,
  REQUIRED_EVIDENCE_COUNT,
  PART1_MAX_WORDS,
  PART2_MAX_WORDS,
  countWords,
} from "@/lib/eventPromo";
import type { EventPromoSubmission } from "@/lib/types";

export function EventPromoTask(props: {
  submissions: EventPromoSubmission[];
  maxSubmissions: number;
  submitting: boolean;
  onSubmit: (evidenceSelected: string[], part1: string, part2: string) => void;
}) {
  const { submissions, maxSubmissions, submitting, onSubmit } = props;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const atLimit = submissions.length >= maxSubmissions;

  const part1Words = countWords(part1);
  const part2Words = countWords(part2);

  function toggleEvidence(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < REQUIRED_EVIDENCE_COUNT) {
        next.add(id);
      }
      return next;
    });
  }

  function handleSubmit() {
    setError(null);
    if (selected.size !== REQUIRED_EVIDENCE_COUNT) {
      setError(`Select exactly ${REQUIRED_EVIDENCE_COUNT} evidence items (you've selected ${selected.size}).`);
      return;
    }
    if (!part1.trim() || !part2.trim()) {
      setError("Both Part 1 and Part 2 are required.");
      return;
    }
    if (part1Words > PART1_MAX_WORDS) {
      setError(`Part 1 is ${part1Words} words -- must be ${PART1_MAX_WORDS} or fewer.`);
      return;
    }
    if (part2Words > PART2_MAX_WORDS) {
      setError(`Part 2 is ${part2Words} words -- must be ${PART2_MAX_WORDS} or fewer.`);
      return;
    }
    onSubmit([...selected], part1.trim(), part2.trim());
  }

  return (
    <div className="scheduling-panel">
      <div className="chat-nudge">
        📣 {EVENT_INFO.name} -- write promotional content for this fictional event, with AI help if you&apos;d
        like. Your submission gets reviewed by independent evaluators afterward, not auto-graded.
      </div>

      <div className="scheduling-constraints">
        <strong>Event details (free to use, don&apos;t count toward the evidence limit)</strong>
        <p style={{ margin: "6px 0 0" }}>
          {EVENT_INFO.date} &middot; {EVENT_INFO.time} &middot; {EVENT_INFO.location} &middot; Admission:{" "}
          {EVENT_INFO.admission}
        </p>
        <p style={{ margin: "6px 0 0", color: "#666" }}>{EVENT_INFO.note}</p>
      </div>

      <div className="scheduling-constraints">
        <strong>
          Evidence -- select exactly {REQUIRED_EVIDENCE_COUNT} ({selected.size}/{REQUIRED_EVIDENCE_COUNT} selected)
        </strong>
        <ul className="staff-background-list" style={{ marginTop: 10 }}>
          {EVIDENCE_ITEMS.map((item) => {
            const isChecked = selected.has(item.id);
            const disabled = !isChecked && selected.size >= REQUIRED_EVIDENCE_COUNT;
            return (
              <li key={item.id}>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: disabled ? "default" : "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled || atLimit}
                    onChange={() => toggleEvidence(item.id)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <strong>
                      {item.id}. {item.label}:
                    </strong>{" "}
                    {item.text}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {submissions.length > 0 && (
        <div className="caption-submitted-list">
          <span className="caption-submitted-label">
            Your submissions ({submissions.length}/{maxSubmissions})
          </span>
          {submissions.map((s, i) => (
            <div className="caption-submitted-item" key={s.submittedAt}>
              <span className="caption-submitted-index">{i + 1}.</span>
              <p style={{ margin: "0 0 4px" }}>
                <strong>Evidence:</strong> {s.evidenceSelected.join(", ")}
              </p>
              <p style={{ margin: "0 0 4px", whiteSpace: "pre-wrap" }}>
                <strong>Part 1:</strong> {s.part1}
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                <strong>Part 2:</strong> {s.part2}
              </p>
              <span className="caption-submitted-time">{new Date(s.submittedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {atLimit ? (
        <p className="caption-submit-limit">You&apos;ve submitted the maximum of {maxSubmissions} times.</p>
      ) : (
        <>
          <div className="caption-form">
            <label htmlFor="promo-part1">
              Part 1: Promotional message ({part1Words}/{PART1_MAX_WORDS} words)
            </label>
            <textarea
              id="promo-part1"
              rows={5}
              placeholder="Write your promotional message here (include date, time, location, and admission price)..."
              value={part1}
              onChange={(e) => setPart1(e.target.value)}
            />
          </div>

          <div className="caption-form">
            <label htmlFor="promo-part2">
              Part 2: Response to &quot;{ATTENDEE_CONCERN}&quot; ({part2Words}/{PART2_MAX_WORDS} words)
            </label>
            <textarea
              id="promo-part2"
              rows={4}
              placeholder="Write your response to this potential attendee's concern here..."
              value={part2}
              onChange={(e) => setPart2(e.target.value)}
            />
          </div>

          {error && <p className="scheduling-error">{error}</p>}

          <button className="caption-submit-btn" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </>
      )}
    </div>
  );
}
