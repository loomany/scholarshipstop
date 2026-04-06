-- Remote projects that skipped earlier migrations may lack `state_region`; PostgREST then rejects writes mentioning the column.
alter table public.profiles
  add column if not exists state_region text;
