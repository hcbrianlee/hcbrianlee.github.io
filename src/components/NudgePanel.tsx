"use client";

import type { CopyBlock } from "@/lib/types";

export function NudgePanel({ infoCopy, pricingCopy }: { infoCopy: CopyBlock | null; pricingCopy: CopyBlock }) {
  if (!infoCopy && !pricingCopy) return null;

  return (
    <div className="nudge-panel-salient">
      {infoCopy && (
        <div className="nudge-block info">
          <strong>{infoCopy.title}</strong>
          {infoCopy.body}
        </div>
      )}
      <div className="nudge-block pricing">
        <strong>{pricingCopy.title}</strong>
        {pricingCopy.body}
      </div>
    </div>
  );
}
