"use client";

import { useState } from "react";
import type { CumulativeUsage } from "@/lib/types";
import { formatCents, formatGrams, formatMl } from "@/lib/format";

export function DonationModal(props: {
  fixedCreditCents: number;
  cumulative: CumulativeUsage;
  submitting: boolean;
  result: { donationCents: number; remainingCents: number } | null;
  onClose: () => void;
  onSubmit: (donationCents: number) => void;
}) {
  const { fixedCreditCents, cumulative, submitting, result, onClose, onSubmit } = props;
  const remainingCents = Math.max(0, fixedCreditCents - cumulative.spentCents);
  const [wantsToDonate, setWantsToDonate] = useState<boolean | null>(null);
  const [dollars, setDollars] = useState(Math.round(remainingCents / 100 / 2));

  if (result) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <h2>Thanks for participating 🌿</h2>
          <p>Here&apos;s a summary of this session.</p>
          <ul className="summary-list">
            <li>
              <span>Prompts sent</span>
              <span>{cumulative.promptCount}</span>
            </li>
            <li>
              <span>Estimated CO₂</span>
              <span>{formatGrams(cumulative.co2G)}</span>
            </li>
            <li>
              <span>Estimated water</span>
              <span>{formatMl(cumulative.waterMl)}</span>
            </li>
            <li>
              <span>Donated</span>
              <span>{formatCents(result.donationCents)}</span>
            </li>
            <li>
              <span>You keep</span>
              <span>{formatCents(result.remainingCents)}</span>
            </li>
          </ul>
          <div className="modal-actions">
            <button className="primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxDollars = Math.max(0, Math.floor(remainingCents / 100));

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Finish session</h2>
        <p>
          Do you want to donate part of your ${(remainingCents / 100).toFixed(2)} remaining participation reward to
          a pro-environmental organization?
          {cumulative.spentCents > 0 && (
            <> You started with ${(fixedCreditCents / 100).toFixed(2)} and spent {formatCents(cumulative.spentCents)} on model usage.</>
          )}
        </p>

        <div className="donate-choice">
          <button className={wantsToDonate === true ? "active" : ""} onClick={() => setWantsToDonate(true)}>
            Yes, I&apos;ll donate
          </button>
          <button className={wantsToDonate === false ? "active" : ""} onClick={() => setWantsToDonate(false)}>
            No thanks
          </button>
        </div>

        {wantsToDonate === true && (
          <div className="donate-amount-row">
            <input
              type="range"
              min={0}
              max={maxDollars}
              step={1}
              value={dollars}
              onChange={(e) => setDollars(Number(e.target.value))}
            />
            <span className="amount">${dollars}</span>
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={wantsToDonate === null || submitting}
            onClick={() => onSubmit(wantsToDonate ? dollars * 100 : 0)}
          >
            {submitting ? "Submitting..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
