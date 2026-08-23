-- Green Nudging AI experiment schema (Supabase / Postgres)
-- Run this once against a fresh Supabase project (SQL editor, or `supabase db push`).

create extension if not exists pgcrypto;

-- One row per experimental cell: info framing x pricing framing.
-- Kept data-driven (not hardcoded in the app) so the condition matrix can be
-- resized without a code change -- session assignment always hashes into
-- `select count(*) from conditions`.
--
-- 2026-08 redesign: 2 pricing arms (variable/flat) x 4 info arms
-- (none/token/environmental/environmental_token) = 8 cells. The old
-- "fixed" pricing arm (pick heavy/light once for a flat upfront price) and
-- the old "energy_usage"/"convenience" info arms were dropped; "free" was
-- renamed "flat" (same behavior, new name). See sql/seed_conditions.sql.
create table if not exists conditions (
  id serial primary key,
  code text unique not null,
  info_variant text not null check (info_variant in ('none', 'token', 'environmental', 'environmental_token')),
  pricing_variant text not null check (pricing_variant in ('variable', 'flat')),
  default_model text not null default 'light' check (default_model in ('light', 'heavy')),
  -- False for conditions retired by a redesign (see below) -- existing
  -- `sessions` rows may still reference them by id, so they're never
  -- deleted, just excluded from new random assignment. getConditions()
  -- (src/lib/session.ts) only selects active=true rows.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- `create table if not exists` above only helps on a first-ever run --
-- existing projects need this applied explicitly.
alter table conditions add column if not exists active boolean not null default true;

-- 2026-08 redesign: 2 pricing arms (variable/flat) x 4 info arms
-- (none/token/environmental/environmental_token) = 8 cells, replacing the
-- old 3-pricing x 4-info design. Any pre-redesign rows are RETIRED
-- (active=false), never deleted -- sessions created under the old design
-- still reference them by id, and `sessions.condition_id references
-- conditions(id)` has no cascade. The CHECK constraints below are
-- widened (union of old + new values), not narrowed, specifically so
-- retired rows keep passing them; only sql/seed_conditions.sql's new 8
-- rows are active, so new sessions only ever draw from those.
update conditions set active = false
  where code not in ('V0', 'VT', 'VE', 'VE_T', 'F0', 'FT', 'FE', 'FE_T');
alter table conditions drop constraint if exists conditions_info_variant_check;
alter table conditions add constraint conditions_info_variant_check
  check (info_variant in ('none', 'token', 'environmental', 'environmental_token', 'energy_usage', 'convenience'));
alter table conditions drop constraint if exists conditions_pricing_variant_check;
alter table conditions add constraint conditions_pricing_variant_check
  check (pricing_variant in ('variable', 'flat', 'fixed', 'free'));

-- One row per participant session. The condition is assigned once, at
-- creation time, via a deterministic hash of the session id -- see
-- src/lib/assignment.ts. Re-hashing the same session id always yields the
-- same condition, so assignment never depends on client-side randomness.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  condition_id integer not null references conditions(id),
  participant_ref text,
  fixed_credit_cents integer not null default 1000,
  donation_cents integer,
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Filename only (e.g. "510.jpg"), chosen once via the same deterministic
  -- hash-mod-N scheme as condition assignment (src/lib/cartoons.ts). The
  -- image itself is never stored here or anywhere in this app -- it's
  -- hotlinked from GitHub at render time.
  cartoon_filename text,
  final_caption text,
  final_caption_submitted_at timestamptz
);

create index if not exists sessions_condition_id_idx on sessions(condition_id);
create index if not exists sessions_participant_ref_idx on sessions(participant_ref);

-- Append-only event log. Every prompt, response, donation, etc. is one row.
-- Token usage and response timing are captured server-side from the LLM
-- provider's own API response, never trusted from the client.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  event_type text not null check (event_type in (
    'session_started',
    'prompt_submitted',
    'response_received',
    'fixed_plan_selected',
    'caption_submitted',
    'schedule_started',
    'schedule_submitted',
    'staff_schedule_started',
    'staff_schedule_submitted',
    'ad_caption_submitted',
    'trip_plan_submitted',
    'donation_submitted',
    'session_ended'
  )),
  model text,
  provider text,
  prompt_text text,
  prompt_length_chars integer,
  response_text text,
  caption_text text,
  cartoon_filename text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  response_time_ms integer,
  estimated_energy_wh numeric,
  estimated_co2_g numeric,
  estimated_water_ml numeric,
  estimated_cost_cents numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_session_id_idx on events(session_id);
create index if not exists events_event_type_idx on events(event_type);
create index if not exists events_created_at_idx on events(created_at);

-- Convenience view: per-session cumulative usage, used to render the
-- running "usage so far" sidebar and the end-of-session donation summary.
create or replace view session_usage_summary as
select
  s.id as session_id,
  count(*) filter (where e.event_type = 'prompt_submitted') as prompt_count,
  coalesce(sum(e.total_tokens) filter (where e.event_type = 'response_received'), 0) as total_tokens,
  coalesce(sum(e.estimated_co2_g) filter (where e.event_type = 'response_received'), 0) as total_co2_g,
  coalesce(sum(e.estimated_water_ml) filter (where e.event_type = 'response_received'), 0) as total_water_ml,
  -- Not filtered to one event_type: "variable" pricing charges on each
  -- response_received row, "fixed" pricing charges once on a
  -- fixed_plan_selected row -- estimated_cost_cents is simply null on every
  -- other row type, so an unfiltered sum picks up whichever applies.
  coalesce(sum(e.estimated_cost_cents), 0) as total_spent_cents,
  count(*) filter (where e.event_type = 'response_received' and e.model = 'light') as light_responses,
  count(*) filter (where e.event_type = 'response_received' and e.model = 'heavy') as heavy_responses
from sessions s
left join events e on e.session_id = s.id
group by s.id;

-- Platform-wide (not per-session) average response length per model, used
-- for the "token"/"environmental" model-toggle captions (ModelPicker.tsx,
-- via getAverageTokensPerModel in src/lib/session.ts) -- a real measured
-- average rather than a guessed constant, same principle as the
-- "convenience" condition's timing being measured rather than researched.
create or replace view model_avg_tokens as
select
  model,
  avg(total_tokens)::numeric as avg_tokens,
  count(*) as response_count
from events
where event_type = 'response_received' and model is not null
group by model;

-- Single-row table of live experimenter overrides for LLM request params,
-- edited from /admin (see ADMIN_DASHBOARD_SECRET in .env.example). Every
-- column is nullable -- null means "use the src/lib/models.ts default for
-- that model." This is a temporary internal tool, expected to be removed
-- once the experiment's actual parameters are settled; keeping it as one
-- row rather than an events-style log keeps that removal a one-line drop.
create table if not exists experiment_overrides (
  id integer primary key default 1,
  active_task text not null default 'cartoon' check (active_task in ('cartoon', 'scheduling', 'staffScheduling', 'adCaption', 'tripPlanning')),
  heavy_temperature numeric,
  light_temperature numeric,
  heavy_top_p numeric,
  light_top_p numeric,
  heavy_presence_penalty numeric,
  light_presence_penalty numeric,
  heavy_max_tokens integer,
  light_max_tokens integer,
  heavy_system_tone text,
  light_system_tone text,
  heavy_system_prompt text,
  light_system_prompt text,
  heavy_seed integer,
  light_seed integer,
  heavy_delay_base_sec numeric,
  light_delay_base_sec numeric,
  heavy_delay_jitter_sec numeric,
  light_delay_jitter_sec numeric,
  heavy_reasoning_effort text,
  light_reasoning_effort text,
  updated_at timestamptz not null default now(),
  constraint experiment_overrides_singleton check (id = 1)
);

-- `create table if not exists` above only helps on a first-ever run --
-- these columns were added/removed after some projects already had the
-- table, so apply the same changes explicitly on a re-run too.
alter table experiment_overrides add column if not exists heavy_seed integer;
alter table experiment_overrides add column if not exists light_seed integer;
alter table experiment_overrides add column if not exists heavy_delay_base_sec numeric;
alter table experiment_overrides add column if not exists light_delay_base_sec numeric;
alter table experiment_overrides add column if not exists heavy_delay_jitter_sec numeric;
alter table experiment_overrides add column if not exists light_delay_jitter_sec numeric;
alter table experiment_overrides add column if not exists heavy_top_p numeric;
alter table experiment_overrides add column if not exists light_top_p numeric;
alter table experiment_overrides add column if not exists heavy_system_prompt text;
alter table experiment_overrides add column if not exists light_system_prompt text;
-- top_k never had an effect (OpenAI's API has no top_k param, and both
-- models run on OpenAI) -- dropped rather than left as dead columns.
alter table experiment_overrides drop column if exists heavy_top_k;
alter table experiment_overrides drop column if exists light_top_k;
alter table experiment_overrides add column if not exists active_task text not null default 'cartoon';
-- Reasoning-model-only knob (o1/o3/o4-* via /admin) -- no effect on a
-- standard chat model like light (gpt-4o-mini).
alter table experiment_overrides add column if not exists heavy_reasoning_effort text;
alter table experiment_overrides add column if not exists light_reasoning_effort text;
alter table experiment_overrides drop constraint if exists experiment_overrides_active_task_check;
alter table experiment_overrides add constraint experiment_overrides_active_task_check
  check (active_task in ('cartoon', 'scheduling', 'staffScheduling', 'adCaption', 'tripPlanning'));

-- Same "alter existing table" pattern for events.event_type -- the inline
-- check on create table only takes effect on a brand new table, so an
-- existing table's constraint needs to be replaced explicitly to add
-- 'schedule_started' / 'schedule_submitted' / 'staff_schedule_started' /
-- 'staff_schedule_submitted' / 'ad_caption_submitted' / 'trip_plan_submitted'.
alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check check (event_type in (
  'session_started',
  'prompt_submitted',
  'response_received',
  'fixed_plan_selected',
  'caption_submitted',
  'schedule_started',
  'schedule_submitted',
  'staff_schedule_started',
  'staff_schedule_submitted',
  'ad_caption_submitted',
  'trip_plan_submitted',
  'donation_submitted',
  'session_ended'
));

-- Row Level Security: this app talks to Supabase exclusively from Next.js
-- API routes using the service role key, never from the browser, so RLS can
-- stay default-deny. Enabling it here is a safety net in case the anon key
-- is ever exposed to the client.
alter table conditions enable row level security;
alter table sessions enable row level security;
alter table events enable row level security;
alter table experiment_overrides enable row level security;
