"use client";

import type { CopyBlock } from "@/lib/types";

export function NudgePanel({ infoCopy }: { infoCopy: CopyBlock | null }) {
  if (!infoCopy) return null;

  return (
    <div className="nudge-panel-salient">
      <div className="nudge-block info">
        <strong>{infoCopy.title}</strong>
        {infoCopy.body}
      </div>
    </div>
  );
}
