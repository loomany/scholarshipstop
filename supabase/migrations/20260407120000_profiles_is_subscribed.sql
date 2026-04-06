-- Track full-access entitlement directly on profiles.
alter table public.profiles
  add column if not exists is_subscribed boolean not null default false;

-- Backfill from Stripe subscriptions so existing paid users keep access.
update public.profiles as p
set is_subscribed = exists (
  select 1
  from public.subscriptions as s
  where s.user_id = p.id
    and s.status in ('trialing', 'active')
);
