"use client";

import { useEffect, useState } from "react";

/**
 * Whole-session countdown, admin-editable (src/lib/pricing.ts
 * getSessionTimeLimitMinutes, /admin's "Session time limit" field).
 * Purely advisory: running past it never blocks chat or submissions --
 * every submit-* route independently stamps a `late` flag into the
 * event's metadata based on the same deadline, computed server-side, so
 * this display is never the source of truth for that, only a heads-up.
 */
export function SessionTimer(props: { startedAt: string; limitMinutes: number }) {
  const { startedAt, limitMinutes } = props;
  const deadline = new Date(startedAt).getTime() + limitMinutes * 60 * 1000;
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemainingMs(deadline - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const expired = remainingMs <= 0;

  if (expired) {
    return (
      <div className="session-timer session-timer-expired">
        ⏰ Time&apos;s up -- you can keep working, but anything submitted from here on will be marked late and may not
        count toward your results.
      </div>
    );
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="session-timer">
      Time remaining: {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
