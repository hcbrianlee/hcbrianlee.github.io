-- Seeds the 2 (pricing) x 4 (info) = 8-cell condition matrix from the
-- 2026-08 experimental redesign:
--
--                  none   token   environmental   environmental_token
-- variable (budget)  V0     VT         VE                VE_T
-- flat (no budget)   F0     FT         FE                FE_T
--
-- Codes use underscores (VE_T, FE_T) rather than the design doc's literal
-- "VE+T"/"FE+T" -- a "+" in a condition code would get decoded as a space
-- if ever passed through a URL query string (?condition=...), which is
-- exactly how the debug-forced-condition path works (see page.tsx).
--
-- Run this after sql/schema.sql. Re-running this file is safe: it upserts
-- on the unique `code` column.

insert into conditions (code, info_variant, pricing_variant, default_model)
values
  ('V0',   'none',                 'variable', 'light'),
  ('VT',   'token',                'variable', 'light'),
  ('VE',   'environmental',        'variable', 'light'),
  ('VE_T', 'environmental_token',  'variable', 'light'),

  ('F0',   'none',                 'flat',     'light'),
  ('FT',   'token',                'flat',     'light'),
  ('FE',   'environmental',        'flat',     'light'),
  ('FE_T', 'environmental_token',  'flat',     'light')
on conflict (code) do update set
  info_variant = excluded.info_variant,
  pricing_variant = excluded.pricing_variant,
  default_model = excluded.default_model;
