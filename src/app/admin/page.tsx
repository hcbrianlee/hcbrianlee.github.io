"use client";

import { useEffect, useState } from "react";

const ADMIN_KEY_STORAGE = "gn_admin_key";

interface ModelDefaults {
  provider: string;
  temperature: number;
  topP: number;
  topK: number | null;
  presencePenalty: number;
  maxTokens: number;
  systemTone: string;
  seed: number | null;
}

interface Defaults {
  heavy: ModelDefaults;
  light: ModelDefaults;
}

interface Overrides {
  heavyTemperature: number | null;
  lightTemperature: number | null;
  heavyTopK: number | null;
  lightTopK: number | null;
  heavyPresencePenalty: number | null;
  lightPresencePenalty: number | null;
  heavyMaxTokens: number | null;
  lightMaxTokens: number | null;
  heavySystemTone: string | null;
  lightSystemTone: string | null;
  heavySeed: number | null;
  lightSeed: number | null;
}

type ModelPrefix = "heavy" | "light";

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
  const label = prefix === "heavy" ? "Heavy" : "Light";
  const temperature = prefix === "heavy" ? overrides.heavyTemperature : overrides.lightTemperature;
  const topK = prefix === "heavy" ? overrides.heavyTopK : overrides.lightTopK;
  const presencePenalty = prefix === "heavy" ? overrides.heavyPresencePenalty : overrides.lightPresencePenalty;
  const maxTokens = prefix === "heavy" ? overrides.heavyMaxTokens : overrides.lightMaxTokens;
  const systemTone = prefix === "heavy" ? overrides.heavySystemTone : overrides.lightSystemTone;
  const seed = prefix === "heavy" ? overrides.heavySeed : overrides.lightSeed;

  return (
    <div className="admin-column">
      <h3>
        {label} <span className="admin-provider-tag">({defaults.provider})</span>
      </h3>

      <NumberField
        label="Temperature"
        value={temperature}
        defaultValue={defaults.temperature}
        step={0.05}
        min={0}
        max={2}
        onChange={(v) => onChange({ [`${prefix}Temperature`]: v })}
      />

      <NumberField
        label="top_k"
        note={defaults.provider === "openai" ? "(no effect -- OpenAI has no top_k param)" : undefined}
        value={topK}
        defaultValue={defaults.topK}
        step={1}
        min={1}
        onChange={(v) => onChange({ [`${prefix}TopK`]: v })}
      />

      <NumberField
        label="presence_penalty"
        note={defaults.provider === "anthropic" ? "(no effect -- Anthropic has no presence_penalty param)" : undefined}
        value={presencePenalty}
        defaultValue={defaults.presencePenalty}
        step={0.1}
        min={-2}
        max={2}
        onChange={(v) => onChange({ [`${prefix}PresencePenalty`]: v })}
      />

      <NumberField
        label="max_tokens"
        value={maxTokens}
        defaultValue={defaults.maxTokens}
        step={1}
        min={1}
        onChange={(v) => onChange({ [`${prefix}MaxTokens`]: v })}
      />

      <div className="admin-field">
        <label>System tone</label>
        <textarea
          rows={3}
          value={systemTone ?? ""}
          placeholder={defaults.systemTone ? defaults.systemTone : "(no default -- appended as an extra system-prompt line if set)"}
          onChange={(e) => onChange({ [`${prefix}SystemTone`]: e.target.value === "" ? null : e.target.value })}
        />
      </div>

      <NumberField
        label="seed"
        note={
          defaults.provider === "anthropic"
            ? "(no effect -- Anthropic has no seed param)"
            : "(pair with temperature 0 for OpenAI's 'best effort' reproducibility -- not a hard guarantee)"
        }
        value={seed}
        defaultValue={defaults.seed}
        step={1}
        onChange={(v) => onChange({ [`${prefix}Seed`]: v })}
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
