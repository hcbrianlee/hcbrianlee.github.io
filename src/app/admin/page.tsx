"use client";

import { useEffect, useState } from "react";

const ADMIN_KEY_STORAGE = "gn_admin_key";

interface ModelDefaults {
  provider: string;
  isReasoning: boolean;
  temperature: number;
  topP: number;
  presencePenalty: number;
  maxTokens: number;
  systemTone: string;
  systemPrompt: string;
  seed: number | null;
  delayBaseSec: number;
  delayJitterSec: number;
  reasoningEffort: string | null;
}

interface Defaults {
  heavy: ModelDefaults;
  light: ModelDefaults;
}

type ActiveTask = "cartoon" | "scheduling" | "staffScheduling" | "adCaption" | "negotiation";

interface Overrides {
  activeTask: ActiveTask;
  heavyTemperature: number | null;
  lightTemperature: number | null;
  heavyTopP: number | null;
  lightTopP: number | null;
  heavyPresencePenalty: number | null;
  lightPresencePenalty: number | null;
  heavyMaxTokens: number | null;
  lightMaxTokens: number | null;
  heavySystemTone: string | null;
  lightSystemTone: string | null;
  heavySystemPrompt: string | null;
  lightSystemPrompt: string | null;
  heavySeed: number | null;
  lightSeed: number | null;
  heavyDelayBaseSec: number | null;
  lightDelayBaseSec: number | null;
  heavyDelayJitterSec: number | null;
  lightDelayJitterSec: number | null;
  heavyReasoningEffort: string | null;
  lightReasoningEffort: string | null;
}

type ModelPrefix = "heavy" | "light";

// Suggested text only -- never sent unless the admin fills it in here and
// clicks Save. Addresses a specific, diagnosed failure mode: standard chat
// models (gpt-4o/gpt-4o-mini) are unreliable at exact multi-constraint
// satisfaction puzzles in one pass unless explicitly told to verify each
// constraint step-by-step. Scoped to the scheduling task only -- does not
// reintroduce topic framing, effort-gating, or caption-task text.
const SUGGESTED_SCHEDULING_PROMPT: Record<ModelPrefix, string> = {
  heavy:
    "You're helping with a 6-speaker scheduling puzzle. Before giving a final answer, check your proposed schedule " +
    "against every constraint you've been given, one at a time, and confirm each is actually satisfied -- even if " +
    "that takes longer. If any constraint fails, revise the schedule and re-check all of them again before answering.",
  light:
    "You're helping with a 6-speaker scheduling puzzle. Give your best answer quickly based on the constraints " +
    "provided, without re-checking each one individually.",
};

// Same rationale as SUGGESTED_SCHEDULING_PROMPT above, for the staffScheduling
// task -- which additionally requires recognizing the constraint set is
// infeasible and identifying which single rule is the actual blocker before
// proposing a relaxation, not just satisfying a solvable set.
const SUGGESTED_STAFF_SCHEDULING_PROMPT: Record<ModelPrefix, string> = {
  heavy:
    "You're helping with a staff-scheduling puzzle. The rules as given may not all be satisfiable at once -- don't " +
    "assume a full solution exists. Systematically check whether every rule can hold simultaneously; if not, " +
    "identify which single rule is the actual structural blocker (not just any rule that seems inconvenient) and " +
    "explain why removing it, specifically, is what makes the rest solvable. Verify your reasoning before answering, " +
    "even if it takes longer.",
  light:
    "You're helping with a staff-scheduling puzzle. Give your best guess at a schedule and a plausible rule to drop " +
    "quickly, without systematically checking whether the rules can all hold at once first.",
};

async function callApi(key: string, method: "GET" | "POST", body?: Partial<Overrides>) {
  const res = await fetch("/api/admin/settings", {
    method,
    headers: { "Content-Type": "application/json", "x-admin-key": key },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as { overrides: Overrides; defaults: Defaults };
}

function NumberField(props: {
  label: string;
  note?: string;
  value: number | null;
  defaultValue: number | null;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number | null) => void;
}) {
  const { label, note, value, defaultValue, step, min, max, onChange } = props;
  return (
    <div className="admin-field">
      <label>
        {label}
        {note && <span className="admin-field-note"> {note}</span>}
      </label>
      <div className="admin-field-row">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value ?? ""}
          placeholder={defaultValue === null ? "(no default)" : String(defaultValue)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        <span className="admin-field-default">default: {defaultValue === null ? "none" : defaultValue}</span>
        {value !== null && (
          <button type="button" className="admin-reset-btn" onClick={() => onChange(null)}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function ModelColumn(props: {
  prefix: ModelPrefix;
  defaults: ModelDefaults;
  overrides: Overrides;
  onChange: (patch: Partial<Overrides>) => void;
}) {
  const { prefix, defaults, overrides, onChange } = props;
  const isScheduling = overrides.activeTask === "scheduling" || overrides.activeTask === "staffScheduling";
  const suggestedPrompt =
    overrides.activeTask === "staffScheduling" ? SUGGESTED_STAFF_SCHEDULING_PROMPT : SUGGESTED_SCHEDULING_PROMPT;
  const label = prefix === "heavy" ? "Heavy" : "Light";
  const temperature = prefix === "heavy" ? overrides.heavyTemperature : overrides.lightTemperature;
  const topP = prefix === "heavy" ? overrides.heavyTopP : overrides.lightTopP;
  const presencePenalty = prefix === "heavy" ? overrides.heavyPresencePenalty : overrides.lightPresencePenalty;
  const maxTokens = prefix === "heavy" ? overrides.heavyMaxTokens : overrides.lightMaxTokens;
  const systemTone = prefix === "heavy" ? overrides.heavySystemTone : overrides.lightSystemTone;
  const systemPrompt = prefix === "heavy" ? overrides.heavySystemPrompt : overrides.lightSystemPrompt;
  const seed = prefix === "heavy" ? overrides.heavySeed : overrides.lightSeed;
  const delayBaseSec = prefix === "heavy" ? overrides.heavyDelayBaseSec : overrides.lightDelayBaseSec;
  const delayJitterSec = prefix === "heavy" ? overrides.heavyDelayJitterSec : overrides.lightDelayJitterSec;
  const reasoningEffort = prefix === "heavy" ? overrides.heavyReasoningEffort : overrides.lightReasoningEffort;
  const reasoningNote = defaults.isReasoning
    ? "(no effect -- this is a reasoning model; the API rejects this param. Use reasoning effort below instead.)"
    : undefined;

  return (
    <div className="admin-column">
      <h3>
        {label} <span className="admin-provider-tag">({defaults.provider})</span>
      </h3>

      <NumberField
        label="Temperature"
        note={reasoningNote}
        value={temperature}
        defaultValue={defaults.temperature}
        step={0.05}
        min={0}
        max={2}
        onChange={(v) => onChange({ [`${prefix}Temperature`]: v })}
      />

      <NumberField
        label="top_p"
        note={
          reasoningNote ??
          "nucleus sampling -- narrows the candidate token pool before temperature reweights it; supported by both providers"
        }
        value={topP}
        defaultValue={defaults.topP}
        step={0.05}
        min={0}
        max={1}
        onChange={(v) => onChange({ [`${prefix}TopP`]: v })}
      />

      <NumberField
        label="presence_penalty"
        note={
          reasoningNote ??
          (defaults.provider === "anthropic" ? "(no effect -- Anthropic has no presence_penalty param)" : undefined)
        }
        value={presencePenalty}
        defaultValue={defaults.presencePenalty}
        step={0.1}
        min={-2}
        max={2}
        onChange={(v) => onChange({ [`${prefix}PresencePenalty`]: v })}
      />

      {defaults.isReasoning && (
        <div className="admin-field">
          <label>
            Reasoning effort{" "}
            <span className="admin-field-note">
              (reasoning models only -- how much internal reasoning the model does before answering; higher costs
              more tokens/time but is more reliable on multi-step tasks like the scheduling puzzle)
            </span>
          </label>
          <div className="admin-field-row">
            <select
              value={reasoningEffort ?? ""}
              onChange={(e) => onChange({ [`${prefix}ReasoningEffort`]: e.target.value === "" ? null : e.target.value })}
            >
              <option value="">default ({defaults.reasoningEffort ?? "API default"})</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            {reasoningEffort !== null && (
              <button
                type="button"
                className="admin-reset-btn"
                onClick={() => onChange({ [`${prefix}ReasoningEffort`]: null })}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      <NumberField
        label="max_tokens"
        value={maxTokens}
        defaultValue={defaults.maxTokens}
        step={1}
        min={1}
        onChange={(v) => onChange({ [`${prefix}MaxTokens`]: v })}
      />

      <div className="admin-field">
        <label>
          System prompt{" "}
          <span className="admin-field-note">
            (no built-in default -- if this is blank, no system message is sent at all, for either task. The model
            gets no instructions about the puzzle/caption task, single-suggestion rule, or heavy/light framing.)
          </span>
        </label>
        <textarea
          rows={8}
          value={systemPrompt ?? ""}
          placeholder="(none -- no system message sent)"
          onChange={(e) => onChange({ [`${prefix}SystemPrompt`]: e.target.value === "" ? null : e.target.value })}
        />
        {isScheduling && (
          <button
            type="button"
            className="admin-reset-btn"
            onClick={() => onChange({ [`${prefix}SystemPrompt`]: suggestedPrompt[prefix] })}
          >
            Fill suggested {label.toLowerCase()} scheduling text
          </button>
        )}
      </div>

      <div className="admin-field">
        <label>System tone</label>
        <textarea
          rows={3}
          value={systemTone ?? ""}
          placeholder="(no default -- appended as an extra line after the system prompt above, if both are set)"
          onChange={(e) => onChange({ [`${prefix}SystemTone`]: e.target.value === "" ? null : e.target.value })}
        />
      </div>

      <NumberField
        label="seed"
        note={
          reasoningNote ??
          (defaults.provider === "anthropic"
            ? "(no effect -- Anthropic has no seed param)"
            : "(pair with temperature 0 for OpenAI's 'best effort' reproducibility -- not a hard guarantee)")
        }
        value={seed}
        defaultValue={defaults.seed}
        step={1}
        onChange={(v) => onChange({ [`${prefix}Seed`]: v })}
      />

      <NumberField
        label="Wait time -- base (sec)"
        note="added after generation completes, before the response finishes"
        value={delayBaseSec}
        defaultValue={defaults.delayBaseSec}
        step={0.5}
        min={0}
        onChange={(v) => onChange({ [`${prefix}DelayBaseSec`]: v })}
      />

      <NumberField
        label="Wait time -- jitter (sec)"
        note="randomizes the wait; see src/app/api/chat/route.ts for the exact formula"
        value={delayJitterSec}
        defaultValue={defaults.delayJitterSec}
        step={0.5}
        min={0}
        onChange={(v) => onChange({ [`${prefix}DelayJitterSec`]: v })}
      />
    </div>
  );
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [overrides, setOverrides] = useState<Overrides | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_KEY_STORAGE);
    if (stored) {
      setKey(stored);
      setKeyInput(stored);
    }
  }, []);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setError(null);
    callApi(key, "GET")
      .then((data) => {
        setDefaults(data.defaults);
        setOverrides(data.overrides);
        window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings");
        window.localStorage.removeItem(ADMIN_KEY_STORAGE);
      })
      .finally(() => setLoading(false));
  }, [key]);

  function handlePatch(patch: Partial<Overrides>) {
    setOverrides((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleSave() {
    if (!key || !overrides) return;
    setSaving(true);
    setError(null);
    try {
      const data = await callApi(key, "POST", overrides);
      setDefaults(data.defaults);
      setOverrides(data.overrides);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!key) {
    return (
      <div className="admin-shell">
        <div className="admin-login">
          <h2>Experiment settings</h2>
          <p>Enter the admin key (ADMIN_DASHBOARD_SECRET) to continue.</p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Admin key"
            onKeyDown={(e) => e.key === "Enter" && setKey(keyInput)}
          />
          <button onClick={() => setKey(keyInput)}>Continue</button>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <h2>Experiment settings</h2>
        <p className="admin-warning">
          Internal tool -- changes take effect on the next chat request for every active session. Expected to be
          removed once experiment parameters are finalized.
        </p>
        {error && <p className="admin-error">{error}</p>}
        {savedAt && !error && <p className="admin-saved">Saved at {savedAt}</p>}
      </div>

      {loading || !defaults || !overrides ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="admin-field admin-task-field">
            <label>
              Active task{" "}
              <span className="admin-field-note">
                (global -- applies to every session, not per-participant like the randomized condition. Temporary
                dev tool for comparing heavy/light across task types.)
              </span>
            </label>
            <select
              value={overrides.activeTask}
              onChange={(e) => handlePatch({ activeTask: e.target.value as ActiveTask })}
            >
              <option value="cartoon">Cartoon caption contest</option>
              <option value="scheduling">Speaker scheduling puzzle</option>
              <option value="staffScheduling">Staff scheduling (infeasible, judged)</option>
              <option value="adCaption">Ad caption (judged)</option>
              <option value="negotiation">Negotiation collab (judged)</option>
            </select>
          </div>

          <div className="admin-columns">
            <ModelColumn prefix="heavy" defaults={defaults.heavy} overrides={overrides} onChange={handlePatch} />
            <ModelColumn prefix="light" defaults={defaults.light} overrides={overrides} onChange={handlePatch} />
          </div>
          <button className="admin-save-btn" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save all"}
          </button>
        </>
      )}
    </div>
  );
}
