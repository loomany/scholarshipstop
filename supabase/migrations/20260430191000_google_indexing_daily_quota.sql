-- Caps Google Indexing API publish calls to match GCP default (200/day per project).
-- Calendar day in America/Los_Angeles (Google documents daily quota reset as Pacific).
-- See: https://developers.google.com/search/apis/indexing-api/v3/quota

create table if not exists public.google_indexing_daily_usage (
  usage_date date not null primary key,
  publish_count integer not null default 0 check (publish_count >= 0)
);

comment on table public.google_indexing_daily_usage is
  'Publish attempts to indexing.googleapis.com per Pacific day; coordinated across workers.';

create or replace function public.google_indexing_try_consume_quota(p_max integer default 200)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (timezone('America/Los_Angeles', clock_timestamp()))::date;
begin
  if p_max < 1 then
    return false;
  end if;

  insert into public.google_indexing_daily_usage (usage_date, publish_count)
  values (d, 0)
  on conflict (usage_date) do nothing;

  update public.google_indexing_daily_usage
  set publish_count = publish_count + 1
  where usage_date = d and publish_count < p_max;

  return found;
end;
$$;

comment on function public.google_indexing_try_consume_quota(integer) is
  'Atomically increments daily count if below p_max; returns true if a publish slot was reserved.';

revoke all on public.google_indexing_daily_usage from public;
revoke all on function public.google_indexing_try_consume_quota(integer) from public;
grant execute on function public.google_indexing_try_consume_quota(integer) to service_role;

alter table public.google_indexing_daily_usage enable row level security;
