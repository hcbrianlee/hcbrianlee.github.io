-- Run this once against a Supabase project that already has
-- sql/migration_add_cartoons_and_captions.sql applied. Safe to run more
-- than once.

alter table sessions add column if not exists final_caption_submitted_at timestamptz;
