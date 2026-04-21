-- Adds lane/bucket-aware quota accounting for Google Indexing API.
-- Goal:
--  - global daily cap (existing behavior, Pacific day),
--  - split between immediate vs queue lanes,
--  - split each lane into scholarship (80%) vs non-scholarship buckets (20% total).

alter table public.google_indexing_queue
  add column if not exists lane text not null default 'queue'
    check (lane in ('immediate', 'queue'));

alter table public.google_indexing_queue
  drop constraint if exists google_indexing_queue_content_kind_check;

alter table public.google_indexing_queue
  add constraint google_indexing_queue_content_kind_check
    check (
      content_kind is null
      or content_kind in ('scholarship', 'resource', 'provider', 'essay', 'page')
    );

create index if not exists google_indexing_queue_pending_lane_added_at_idx
  on public.google_indexing_queue (lane, added_at)
  where status = 'pending';

create table if not exists public.google_indexing_daily_usage_lanes (
  usage_date date not null,
  lane text not null check (lane in ('immediate', 'queue')),
  publish_count integer not null default 0 check (publish_count >= 0),
  primary key (usage_date, lane)
);

create table if not exists public.google_indexing_daily_usage_buckets (
  usage_date date not null,
  lane text not null check (lane in ('immediate', 'queue')),
  bucket text not null check (bucket in ('scholarship', 'resource', 'provider', 'essay', 'page')),
  publish_count integer not null default 0 check (publish_count >= 0),
  primary key (usage_date, lane, bucket)
);

comment on table public.google_indexing_daily_usage_lanes is
  'Google Indexing publish attempts per Pacific day and lane (immediate/queue).';

comment on table public.google_indexing_daily_usage_buckets is
  'Google Indexing publish attempts per Pacific day/lane/content bucket.';

create or replace function public.google_indexing_try_consume_quota_bucket(
  p_lane text,
  p_bucket text,
  p_max_total integer default 200,
  p_max_lane integer default 100,
  p_max_bucket integer default 80
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (timezone('America/Los_Angeles', clock_timestamp()))::date;
  v_total integer;
  v_lane integer;
  v_bucket integer;
begin
  if p_lane not in ('immediate', 'queue') then
    return false;
  end if;
  if p_bucket not in ('scholarship', 'resource', 'provider', 'essay', 'page') then
    return false;
  end if;
  if p_max_total < 1 or p_max_lane < 1 or p_max_bucket < 1 then
    return false;
  end if;

  insert into public.google_indexing_daily_usage (usage_date, publish_count)
  values (d, 0)
  on conflict (usage_date) do nothing;

  insert into public.google_indexing_daily_usage_lanes (usage_date, lane, publish_count)
  values (d, p_lane, 0)
  on conflict (usage_date, lane) do nothing;

  insert into public.google_indexing_daily_usage_buckets (usage_date, lane, bucket, publish_count)
  values (d, p_lane, p_bucket, 0)
  on conflict (usage_date, lane, bucket) do nothing;

  select publish_count into v_total
  from public.google_indexing_daily_usage
  where usage_date = d
  for update;

  select publish_count into v_lane
  from public.google_indexing_daily_usage_lanes
  where usage_date = d and lane = p_lane
  for update;

  select publish_count into v_bucket
  from public.google_indexing_daily_usage_buckets
  where usage_date = d and lane = p_lane and bucket = p_bucket
  for update;

  if v_total >= p_max_total then
    return false;
  end if;
  if v_lane >= p_max_lane then
    return false;
  end if;
  if v_bucket >= p_max_bucket then
    return false;
  end if;

  update public.google_indexing_daily_usage
  set publish_count = publish_count + 1
  where usage_date = d;

  update public.google_indexing_daily_usage_lanes
  set publish_count = publish_count + 1
  where usage_date = d and lane = p_lane;

  update public.google_indexing_daily_usage_buckets
  set publish_count = publish_count + 1
  where usage_date = d and lane = p_lane and bucket = p_bucket;

  return true;
end;
$$;

comment on function public.google_indexing_try_consume_quota_bucket(text, text, integer, integer, integer) is
  'Atomically reserves one publish slot under total + lane + bucket Pacific-day limits.';

revoke all on public.google_indexing_daily_usage_lanes from public;
revoke all on public.google_indexing_daily_usage_buckets from public;
revoke all on function public.google_indexing_try_consume_quota_bucket(text, text, integer, integer, integer) from public;
grant execute on function public.google_indexing_try_consume_quota_bucket(text, text, integer, integer, integer) to service_role;

alter table public.google_indexing_daily_usage_lanes enable row level security;
alter table public.google_indexing_daily_usage_buckets enable row level security;

