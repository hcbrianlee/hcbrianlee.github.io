-- Run this once against a Supabase project that already has sql/schema.sql
-- applied, to support cartoon assignment + final caption submission. Safe to
-- run more than once.

alter table sessions add column if not exists cartoon_filename text;
alter table sessions add column if not exists final_caption text;

alter table events add column if not exists caption_text text;
alter table events add column if not exists cartoon_filename text;

alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check check (event_type in (
  'session_started',
  'prompt_submitted',
  'response_received',
  'fixed_plan_selected',
  'caption_submitted',
  'donation_submitted',
  'session_ended'
));
