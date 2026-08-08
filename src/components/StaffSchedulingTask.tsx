"use client";

import { useEffect, useState } from "react";
import { STAFF, SHIFT_SLOTS, STAFF_CONSTRAINTS } from "@/lib/staffScheduling";

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

export function StaffSchedulingTask(props: {
  startedAt: string | null;
  solved: boolean;
  submitting: boolean;
  starting: boolean;
  onStart: () => void;
  onSubmit: (schedule: string[], droppedConstraintId: number, rationale: string) => Promise<SubmitResult | null>;
}) {
  const { startedAt, solved, submitting, starting, onStart, onSubmit } = props;
  const [assignments, setAssignments] = useState<string[]>(Array(SHIFT_SLOTS.length).fill(""));
  const [droppedConstraintId, setDroppedConstraintId] = useState<number | "">("");
  const [rationale, setRationale] = useState("");
  const [results, setResults] = useState<ConstraintResult[] | null>(null);
  const [solvedMs, setSolvedMs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (solved || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, solved]);

  function handleSlotChange(slotIndex: number, staffId: string) {
    setAssignments((prev) => {
      const next = [...prev];
      next[slotIndex] = staffId;
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (assignments.some((a) => !a)) {
      setError("Assign a staff member to every shift before submitting.");
      return;
    }
    if (new Set(assignments).size !== STAFF.length) {
      setError("Each staff member can only be scheduled once.");
      return;
    }
    if (droppedConstraintId === "") {
      setError("Choose which rule you're relaxing.");
      return;
    }
    if (!rationale.trim()) {
      setError("Explain your rationale for relaxing that rule.");
      return;
    }
    const res = await onSubmit(assignments, droppedConstraintId, rationale.trim());
    if (res) {
      setResults(res.results);
      if (res.allCorrect) {
        setSolvedMs(res.elapsedMs);
      } else {
        setError("That schedule still breaks one of the remaining rules -- check the list below.");
      }
    }
  }

  const usedStaffIds = new Set(assignments.filter(Boolean));
  const isSolved = solved || solvedMs !== null;

  if (!startedAt && !isSolved) {
    return (
      <div className="scheduling-panel">
        <div className="chat-nudge">
          🧩 This week&apos;s staffing puzzle, as written, has <strong>no valid solution</strong> -- 8 rules that all
          have to hold, but can&apos;t all hold at once. Figure out which single rule is the real blocker, decide
          whether to relax it, explain your reasoning, then build a schedule that satisfies everything else. Your
          schedule, the rule you relax, and your rationale all get reviewed by a human judge afterward -- there&apos;s
          no single &quot;correct&quot; answer here. The timer starts when you click below.
        </div>
        <button className="caption-submit-btn" disabled={starting} onClick={onStart}>
          {starting ? "Starting…" : "Start puzzle"}
        </button>
      </div>
    );
  }

  return (
    <div className="scheduling-panel">
      <div className="chat-nudge">
        🧩 This staffing puzzle has no valid solution as written. Pick the one rule you think is the real blocker,
        explain your reasoning, and build a schedule that satisfies every other rule.
      </div>

      <div className={`scheduling-timer${isSolved ? " solved" : ""}`}>
        {isSolved ? `✅ Submitted in ${formatElapsed(solvedMs ?? elapsed)}` : `⏱ ${formatElapsed(elapsed)}`}
      </div>

      <div className="scheduling-constraints">
        <strong>Rules (all 8 must hold, except the one you relax below)</strong>
        <ol>
          {STAFF_CONSTRAINTS.map((c) => {
            const result = results?.find((r) => r.id === c.id);
            const isDropped = droppedConstraintId === c.id;
            return (
              <li key={c.id} className={isDropped ? "" : result ? (result.satisfied ? "satisfied" : "violated") : ""}>
                <span className="constraint-mark">{isDropped ? "➖" : result ? (result.satisfied ? "✅" : "❌") : ""}</span>
                {c.text}
                {isDropped && " (relaxed)"}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="scheduling-slots">
        {SHIFT_SLOTS.map((slot, i) => (
          <div className="scheduling-slot" key={slot.id}>
            <label>{slot.label}</label>
            <select value={assignments[i]} onChange={(e) => handleSlotChange(i, e.target.value)} disabled={isSolved}>
              <option value="">— choose a staff member —</option>
              {STAFF.map((s) => (
                <option key={s.id} value={s.id} disabled={usedStaffIds.has(s.id) && assignments[i] !== s.id}>
                  {s.name}
                  {s.keyholder ? " (keyholder)" : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="scheduling-slot">
        <label>Which rule are you relaxing?</label>
        <select
          value={droppedConstraintId}
          onChange={(e) => setDroppedConstraintId(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={isSolved}
        >
          <option value="">— choose a rule to relax —</option>
          {STAFF_CONSTRAINTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.text}
            </option>
          ))}
        </select>
      </div>

      <div className="caption-form">
        <label htmlFor="staff-rationale">Why that rule? (this is what gets judged)</label>
        <textarea
          id="staff-rationale"
          rows={4}
          placeholder="Explain why relaxing this specific rule is the right call, and what tradeoff you're accepting..."
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          maxLength={2000}
          disabled={isSolved}
        />
      </div>

      {error && <p className="scheduling-error">{error}</p>}

      {!isSolved && (
        <button className="caption-submit-btn" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Checking…" : "Submit schedule + rationale"}
        </button>
      )}
    </div>
  );
}
