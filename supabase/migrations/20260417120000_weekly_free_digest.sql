-- Weekly AI digest for free users (replaces daily_grant_summary).

alter table public.profiles
  add column if not exists email_weekly_free_digest boolean not null default true;

-- Copy opt-out from legacy column if present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email_daily_summary'
  ) then
    update public.profiles
    set email_weekly_free_digest = email_daily_summary
    where true;
    alter table public.profiles drop column email_daily_summary;
  end if;
end $$;

drop table if exists public.daily_grant_summary_sent;

create table if not exists public.weekly_free_digest_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_monday_et date not null,
  match_count integer not null default 0,
  grant_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, week_start_monday_et)
);

create index if not exists weekly_free_digest_sent_week_idx
  on public.weekly_free_digest_sent (week_start_monday_et desc);

alter table public.weekly_free_digest_sent enable row level security;

revoke all on public.weekly_free_digest_sent from anon;
revoke all on public.weekly_free_digest_sent from authenticated;
