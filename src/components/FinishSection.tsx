"use client";

export function FinishSection({
  sessionEnded,
  onDonateClick,
}: {
  sessionEnded: boolean;
  onDonateClick: () => void;
}) {
  if (sessionEnded) {
    return (
      <div className="finish-panel finish-panel-done">✅ Session completed — thanks for participating!</div>
    );
  }

  return (
    <div className="finish-panel">
      <p>Caption submitted. Ready to wrap up your session?</p>
      <button className="donate-btn" onClick={onDonateClick}>
        Finish &amp; Donate
      </button>
    </div>
  );
}
