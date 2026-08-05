-- Run this once against a Supabase project that already has sql/schema.sql
-- applied, to support the "fixed" pricing condition's pre-chat plan picker
-- (heavy/light, one flat fee, chosen before the first message). Safe to run
-- more than once.

alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check check (event_type in (
  'session_started',
  'prompt_submitted',
  'response_received',
  'fixed_plan_selected',
  'donation_submitted',
  'session_ended'
));

drop view if exists session_usage_summary;

create view session_usage_summary as
select
  s.id as session_id,
  count(*) filter (where e.event_type = 'prompt_submitted') as prompt_count,
  coalesce(sum(e.total_tokens) filter (where e.event_type = 'response_received'), 0) as total_tokens,
  coalesce(sum(e.estimated_co2_g) filter (where e.event_type = 'response_received'), 0) as total_co2_g,
  coalesce(sum(e.estimated_water_ml) filter (where e.event_type = 'response_received'), 0) as total_water_ml,
  coalesce(sum(e.estimated_cost_cents), 0) as total_spent_cents,
  count(*) filter (where e.event_type = 'response_received' and e.model = 'light') as light_responses,
  count(*) filter (where e.event_type = 'response_received' and e.model = 'heavy') as heavy_responses
from sessions s
left join events e on e.session_id = s.id
group by s.id;
