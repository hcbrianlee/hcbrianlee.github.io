"use client";

import { useEffect, useState } from "react";
import { SPEAKERS, TIME_SLOTS, SCHEDULING_CONSTRAINTS } from "@/lib/scheduling";

interface ConstraintResult {
  id: number;
  text: string;
  satisfied: boolean;
}

interface SubmitResult {
  results: ConstraintResult[];
  allCorrect: boolean;
  elapsedMs: number;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SchedulingTask(props: {
  sessionStartedAt: string;
  solved: boolean;
  submitting: boolean;
  onSubmit: (schedule: string[]) => Promise<SubmitResult | null>;
}) {
  const { sessionStartedAt, solved, submitting, onSubmit } = props;
  const [assignments, setAssignments] = useState<string[]>(Array(TIME_SLOTS.length).fill(""));
  const [results, setResults] = useState<ConstraintResult[] | null>(null);
  const [solvedMs, setSolvedMs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (solved) return;
    const start = new Date(sessionStartedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionStartedAt, solved]);

  function handleSlotChange(slotIndex: number, speakerId: string) {
    setAssignments((prev) => {
      const next = [...prev];
      next[slotIndex] = speakerId;
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (assignments.some((a) => !a)) {
      setError("Assign a speaker to every time slot before submitting.");
      return;
    }
    if (new Set(assignments).size !== SPEAKERS.length) {
      setError("Each speaker can only be scheduled once.");
      return;
    }
    const res = await onSubmit(assignments);
    if (res) {
      setResults(res.results);
      if (res.allCorrect) setSolvedMs(res.elapsedMs);
    }
  }

  const usedSpeakerIds = new Set(assignments.filter(Boolean));
  const isSolved = solved || solvedMs !== null;

  return (
    <div className="scheduling-panel">
      <div className="chat-nudge">
        🏆 Assign each of the 6 speakers to a time slot so every constraint below is satisfied — solve it as fast
        as you can.
      </div>

      <div className={`scheduling-timer${isSolved ? " solved" : ""}`}>
        {isSolved ? `✅ Solved in ${formatElapsed(solvedMs ?? elapsed)}` : `⏱ ${formatElapsed(elapsed)}`}
      </div>

      <div className="scheduling-constraints">
        <strong>Constraints</strong>
        <ol>
          {SCHEDULING_CONSTRAINTS.map((c) => {
            const result = results?.find((r) => r.id === c.id);
            return (
              <li key={c.id} className={result ? (result.satisfied ? "satisfied" : "violated") : ""}>
                {result && <span className="constraint-mark">{result.satisfied ? "✅" : "❌"}</span>}
                {c.text}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="scheduling-slots">
        {TIME_SLOTS.map((slot, i) => (
          <div className="scheduling-slot" key={slot.id}>
            <label>{slot.label}</label>
            <select value={assignments[i]} onChange={(e) => handleSlotChange(i, e.target.value)} disabled={isSolved}>
              <option value="">— choose a speaker —</option>
              {SPEAKERS.map((sp) => (
                <option key={sp.id} value={sp.id} disabled={usedSpeakerIds.has(sp.id) && assignments[i] !== sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <p className="scheduling-error">{error}</p>}

      {!isSolved && (
        <button className="caption-submit-btn" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Checking…" : "Submit schedule"}
        </button>
      )}
    </div>
  );
}
