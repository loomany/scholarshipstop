-- Last URL Inspection attempt (Google Search Console), for queue ordering and auditing.

alter table public.scholarships
  add column if not exists last_index_check timestamptz;

comment on column public.scholarships.last_index_check is
  'When we last ran URL Inspection for this row (success or fail). Null = never checked.';

create index if not exists scholarships_last_index_check_idx
  on public.scholarships (last_index_check asc nulls first)
  where indexing_status in ('pending', 'submitted') and is_active = true;
