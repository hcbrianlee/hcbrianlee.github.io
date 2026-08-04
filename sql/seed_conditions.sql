-- Seeds the 4 (info framing) x 3 (pricing framing) condition matrix from the
-- experimental design doc. The doc itself was unsure whether "convenience
-- (speed)" should be a 4th info arm or dropped to land on exactly 9 cells --
-- this seed keeps all 4 so the full 2x2x... design is available; delete the
-- 'convenience' rows below (or edit this file) to collapse to the 3x3 = 9
-- cell version before running it, if that's the design you land on.
--
-- Re-running this file is safe: it upserts on the unique `code` column.

insert into conditions (code, info_variant, pricing_variant, default_model)
values
  ('environmental_variable', 'environmental', 'variable', 'light'),
  ('environmental_fixed',    'environmental', 'fixed',    'light'),
  ('environmental_free',     'environmental', 'free',     'light'),

  ('energy_usage_variable',  'energy_usage',  'variable', 'light'),
  ('energy_usage_fixed',     'energy_usage',  'fixed',    'light'),
  ('energy_usage_free',      'energy_usage',  'free',     'light'),

  ('convenience_variable',   'convenience',   'variable', 'light'),
  ('convenience_fixed',      'convenience',   'fixed',    'light'),
  ('convenience_free',       'convenience',   'free',     'light'),

  ('none_variable',          'none',          'variable', 'light'),
  ('none_fixed',             'none',          'fixed',    'light'),
  ('none_free',              'none',          'free',     'light')
on conflict (code) do update set
  info_variant = excluded.info_variant,
  pricing_variant = excluded.pricing_variant,
  default_model = excluded.default_model;
