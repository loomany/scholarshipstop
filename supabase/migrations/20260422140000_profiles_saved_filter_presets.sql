-- Persist named Saved Filters presets (up to 4) per user profile for cross-device sync.
alter table public.profiles
  add column if not exists saved_filter_presets jsonb null;
