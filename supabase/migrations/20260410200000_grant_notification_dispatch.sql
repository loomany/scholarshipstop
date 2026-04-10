-- Server-side saved filter snapshot (synced from hub) + dedupe log for grant alerts.

alter table public.profiles
  add column if not exists saved_filters_snapshot jsonb null;

create table if not exists public.grant_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  channel text not null check (channel in ('best', 'saved_filters', 'easy_apply', 'hot_deadlines')),
  medium text not null check (medium in ('email', 'telegram')),
  created_at timestamptz not null default now(),
  unique (user_id, scholarship_id, channel, medium)
);

create index if not exists grant_notification_deliveries_created_at_idx
  on public.grant_notification_deliveries (created_at desc);

alter table public.grant_notification_deliveries enable row level security;

revoke all on public.grant_notification_deliveries from anon;
revoke all on public.grant_notification_deliveries from authenticated;
