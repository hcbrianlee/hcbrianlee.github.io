"use client";

import { useState } from "react";
import {
  EVENT_INFO,
  EVIDENCE_ITEMS,
  ATTENDEE_CONCERN,
  TASK_INSTRUCTIONS,
  PART1_INTRO,
  PART1_REQUIREMENTS,
  PART2_INTRO,
  PART2_BODY,
  PART2_REQUIREMENT,
  EVIDENCE_RULES,
  EVIDENCE_RULE_5_EXAMPLE,
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
      <div className="chat-nudge">{TASK_INSTRUCTIONS}</div>

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

      <div className="scheduling-constraints">
        <strong>Your Task</strong>
        <p style={{ margin: "6px 0 0" }}>You will create two coordinated promotional messages.</p>

        <p style={{ margin: "12px 0 0" }}>
          <strong>Part 1: Promotional Message</strong>
        </p>
        <p style={{ margin: "4px 0 0" }}>{PART1_INTRO}</p>
        <p style={{ margin: "4px 0 0" }}>Your message must:</p>
        <ul style={{ margin: "4px 0 0" }}>
          {PART1_REQUIREMENTS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <p style={{ margin: "12px 0 0" }}>
          <strong>Part 2: Response to a Potential Attendee</strong>
        </p>
        <p style={{ margin: "4px 0 0" }}>{PART2_INTRO}</p>
        <p style={{ margin: "4px 0 0", fontStyle: "italic" }}>&quot;{ATTENDEE_CONCERN}&quot;</p>
        <p style={{ margin: "4px 0 0" }}>{PART2_BODY}</p>
        <p style={{ margin: "4px 0 0" }}>{PART2_REQUIREMENT}</p>
      </div>

      <div className="scheduling-constraints">
        <strong>Evidence Rules (across Parts 1 and 2 combined)</strong>
        <ol style={{ margin: "6px 0 0" }}>
          {EVIDENCE_RULES.map((rule, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {rule}
              {i === 4 && (
                <p style={{ margin: "4px 0 0", color: "#666", fontStyle: "italic" }}>{EVIDENCE_RULE_5_EXAMPLE}</p>
              )}
            </li>
          ))}
        </ol>
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
