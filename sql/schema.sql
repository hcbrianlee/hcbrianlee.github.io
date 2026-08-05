-- Green Nudging AI experiment schema (Supabase / Postgres)
-- Run this once against a fresh Supabase project (SQL editor, or `supabase db push`).

create extension if not exists pgcrypto;

-- One row per experimental cell: info framing x pricing framing.
-- Kept data-driven (not hardcoded in the app) so the condition matrix can be
-- resized (e.g. 9 vs 12 cells) without a code change -- session assignment
-- always hashes into `select count(*) from conditions`.
create table if not exists conditions (
  id serial primary key,
  code text unique not null,
  info_variant text not null check (info_variant in ('environmental', 'energy_usage', 'convenience', 'none')),
  pricing_variant text not null check (pricing_variant in ('variable', 'fixed', 'free')),
  default_model text not null default 'light' check (default_model in ('light', 'heavy')),
  created_at timestamptz not null default now()
);

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
  ended_at timestamptz
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
    'donation_submitted',
    'session_ended'
  )),
  model text,
  provider text,
  prompt_text text,
  prompt_length_chars integer,
  response_text text,
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

-- Row Level Security: this app talks to Supabase exclusively from Next.js
-- API routes using the service role key, never from the browser, so RLS can
-- stay default-deny. Enabling it here is a safety net in case the anon key
-- is ever exposed to the client.
alter table conditions enable row level security;
alter table sessions enable row level security;
alter table events enable row level security;
