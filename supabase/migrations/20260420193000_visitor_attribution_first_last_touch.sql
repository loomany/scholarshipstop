-- First/last touch attribution table for visitor source audit.
-- Keeps immutable first-touch and mutable last-touch in one row per visitor_id.

create table if not exists public.visitor_attribution (
  visitor_id uuid primary key,
  user_id uuid null references auth.users(id) on delete set null,

  first_seen_at timestamptz not null default now(),
  first_source text null,
  first_medium text null,
  first_campaign text null,
  first_referrer text null,
  first_landing_path text null,
  first_gclid text null,
  first_fbclid text null,
  first_ttclid text null,

  last_seen_at timestamptz not null default now(),
  last_source text null,
  last_medium text null,
  last_campaign text null,
  last_referrer text null,
  last_landing_path text null,
  last_gclid text null,
  last_fbclid text null,
  last_ttclid text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visitor_attribution_user_id_idx
  on public.visitor_attribution(user_id);

create index if not exists visitor_attribution_last_seen_idx
  on public.visitor_attribution(last_seen_at desc);

create or replace function public.visitor_attribution_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists visitor_attribution_set_updated_at_trigger on public.visitor_attribution;
create trigger visitor_attribution_set_updated_at_trigger
before update on public.visitor_attribution
for each row execute function public.visitor_attribution_set_updated_at();

alter table public.visitor_attribution enable row level security;

drop policy if exists "service_role all visitor_attribution" on public.visitor_attribution;
create policy "service_role all visitor_attribution"
  on public.visitor_attribution
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.visitor_attribution from public;
revoke all on public.visitor_attribution from anon, authenticated;
grant select, insert, update, delete on public.visitor_attribution to service_role;

create or replace function public.upsert_visitor_attribution(
  p_visitor_id uuid,
  p_user_id uuid,
  p_source text,
  p_medium text,
  p_campaign text,
  p_referrer text,
  p_landing_path text,
  p_gclid text,
  p_fbclid text,
  p_ttclid text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.visitor_attribution (
    visitor_id,
    user_id,
    first_source,
    first_medium,
    first_campaign,
    first_referrer,
    first_landing_path,
    first_gclid,
    first_fbclid,
    first_ttclid,
    last_source,
    last_medium,
    last_campaign,
    last_referrer,
    last_landing_path,
    last_gclid,
    last_fbclid,
    last_ttclid,
    first_seen_at,
    last_seen_at
  )
  values (
    p_visitor_id,
    p_user_id,
    p_source,
    p_medium,
    p_campaign,
    p_referrer,
    p_landing_path,
    p_gclid,
    p_fbclid,
    p_ttclid,
    p_source,
    p_medium,
    p_campaign,
    p_referrer,
    p_landing_path,
    p_gclid,
    p_fbclid,
    p_ttclid,
    now(),
    now()
  )
  on conflict (visitor_id) do update
  set
    user_id = coalesce(excluded.user_id, visitor_attribution.user_id),
    last_source = excluded.last_source,
    last_medium = excluded.last_medium,
    last_campaign = excluded.last_campaign,
    last_referrer = excluded.last_referrer,
    last_landing_path = excluded.last_landing_path,
    last_gclid = excluded.last_gclid,
    last_fbclid = excluded.last_fbclid,
    last_ttclid = excluded.last_ttclid,
    last_seen_at = now();
end;
$$;

revoke all on function public.upsert_visitor_attribution(
  uuid, uuid, text, text, text, text, text, text, text, text
) from public;

grant execute on function public.upsert_visitor_attribution(
  uuid, uuid, text, text, text, text, text, text, text, text
) to service_role;
