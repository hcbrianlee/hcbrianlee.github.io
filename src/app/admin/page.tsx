"use client";

import { useEffect, useState } from "react";
import {
  EVIDENCE_ITEMS as DEFAULT_EVIDENCE_ITEMS,
  parseEvidenceItemsText,
  formatEvidenceItemsText,
  type EvidenceItem,
} from "@/lib/eventPromo";

const ADMIN_KEY_STORAGE = "gn_admin_key";

interface ModelDefaults {
  model: string;
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
  maxTokensPerSession: number;
  heavy: ModelDefaults;
  light: ModelDefaults;
}

type ActiveTask = "cartoon" | "scheduling" | "staffScheduling" | "adCaption" | "tripPlanning" | "eventPromo";

interface Overrides {
  activeTask: ActiveTask;
  maxTokensPerSession: number | null;
  heavyModel: string | null;
  lightModel: string | null;
  eventPromoEvidence: EvidenceItem[] | null;
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

// Curated OpenAI model choices for the heavy/light slot dropdowns -- price
// and benchmark tradeoffs discussed with the experimenter, all confirmed
// live on the API as of Sept 2026. gpt-5-mini/gpt-5-nano take the same
// max_completion_tokens/reasoning_effort request shape as the o-series
// models despite not being marketed as "reasoning models" -- see
// isReasoningModelId below and src/lib/providers/openai.ts.
const MODEL_CHOICES: { value: string; label: string }[] = [
  { value: "o4-mini", label: "o4-mini (reasoning)" },
  { value: "o3-mini", label: "o3-mini (reasoning)" },
  { value: "gpt-5-mini", label: "gpt-5-mini (reasoning-shaped)" },
  { value: "gpt-5-nano", label: "gpt-5-nano (reasoning-shaped)" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini (non-reasoning)" },
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano (non-reasoning)" },
];

// Mirrors src/lib/providers/openai.ts isReasoningModel -- duplicated here
// (rather than imported) because that file also pulls in the `openai`
// package, which isn't meant to load into a client bundle. Used to decide
// which fields to show/gray-out for whichever model id is actually
// effective (the /admin override if set, else the env default) -- the
// server-side isReasoning flag in `defaults` only reflects the static env
// default and doesn't know about a live override.
function isReasoningModelId(model: string): boolean {
  return /^o\d/i.test(model) || /^gpt-5/i.test(model);
}

// Mirrors src/app/api/chat/route.ts's DEFAULT_MAX_TOKENS/DEFAULT_MAX_TOKENS_REASONING -- used
// to show the right "default" max_tokens for whichever model is actually
// effective, not just the static env-configured one.
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_MAX_TOKENS_REASONING = 4096;

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

// Local text state (not fully controlled straight from `value`, unlike the
// other fields) is deliberate: parseEvidenceItemsText skips a line that
// isn't yet a complete "id. label: text" (e.g. while typing a new item), so
// re-deriving the textarea's displayed text from the parsed-and-reformatted
// result on every keystroke would erase whatever incomplete line the admin
// is mid-typing. Only mounts once /admin's data has already loaded (see the
// `loading || !overrides` gate below), so the initial text always reflects
// the real current override, not a stale default.
function EvidenceEditor(props: { value: EvidenceItem[] | null; onChange: (items: EvidenceItem[] | null) => void }) {
  const { value, onChange } = props;
  const [text, setText] = useState(() => formatEvidenceItemsText(value ?? DEFAULT_EVIDENCE_ITEMS));
  const parsed = parseEvidenceItemsText(text);

  function handleChange(next: string) {
    setText(next);
    onChange(parseEvidenceItemsText(next));
  }

  function handleReset() {
    setText(formatEvidenceItemsText(DEFAULT_EVIDENCE_ITEMS));
    onChange(null);
  }

  return (
    <div className="admin-field">
      <label>
        Event Promo evidence set{" "}
        <span className="admin-field-note">
          (global -- one item per line, exactly &quot;Eid. Label: text&quot;, e.g. &quot;E1. Food vendors: The event
          will feature 28 food vendors...&quot;. IDs, count, and required-selection count (6) are all driven by
          whatever&apos;s parsed here -- a malformed line is silently skipped, not an error.)
        </span>
      </label>
      <textarea
        rows={14}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
      <div className="admin-field-row">
        <span className="admin-field-default">{parsed.length} evidence item{parsed.length === 1 ? "" : "s"} parsed</span>
        {value !== null && (
          <button type="button" className="admin-reset-btn" onClick={handleReset}>
            Reset to default
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
  const model = prefix === "heavy" ? overrides.heavyModel : overrides.lightModel;
  // Which model id is actually effective (the /admin override if set, else
  // the MODEL_HEAVY_ID/MODEL_LIGHT_ID env default) -- everything below that
  // depends on "is this a reasoning model" reacts to THIS, not the static
  // defaults.isReasoning, so switching the dropdown updates the rest of the
  // column immediately, before Save is even clicked.
  const effectiveModel = model ?? defaults.model;
  const effectiveIsReasoning = isReasoningModelId(effectiveModel);
  const effectiveDefaultMaxTokens = effectiveIsReasoning ? DEFAULT_MAX_TOKENS_REASONING : DEFAULT_MAX_TOKENS;
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
  const reasoningNote = effectiveIsReasoning
    ? "(no effect -- this is a reasoning model; the API rejects this param. Use reasoning effort below instead.)"
    : undefined;

  return (
    <div className="admin-column">
      <h3>
        {label} <span className="admin-provider-tag">({defaults.provider})</span>
      </h3>

      <div className="admin-field">
        <label>
          Model{" "}
          <span className="admin-field-note">
            (which actual model powers this slot -- switching this changes request shape live, see the notes below)
          </span>
        </label>
        <div className="admin-field-row">
          <select
            value={model ?? ""}
            onChange={(e) => onChange({ [`${prefix}Model`]: e.target.value === "" ? null : e.target.value })}
          >
            <option value="">default ({defaults.model})</option>
            {MODEL_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {model !== null && (
            <button type="button" className="admin-reset-btn" onClick={() => onChange({ [`${prefix}Model`]: null })}>
              Reset
            </button>
          )}
        </div>
      </div>

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

      {effectiveIsReasoning && (
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
        defaultValue={effectiveDefaultMaxTokens}
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
              <option value="tripPlanning">Trip planning collab (judged)</option>
              <option value="eventPromo">Event promo (evidence-constrained, judged)</option>
            </select>
          </div>

          <NumberField
            label="Token limit per session"
            note="(applies only to variable-pricing sessions -- V0/VT/VE/VE_T. Flat sessions have no token cap at all. See src/lib/pricing.ts getMaxTokensPerSession.)"
            value={overrides.maxTokensPerSession}
            defaultValue={defaults.maxTokensPerSession}
            step={100}
            min={1}
            onChange={(v) => handlePatch({ maxTokensPerSession: v })}
          />

          <EvidenceEditor
            value={overrides.eventPromoEvidence}
            onChange={(items) => handlePatch({ eventPromoEvidence: items })}
          />

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
