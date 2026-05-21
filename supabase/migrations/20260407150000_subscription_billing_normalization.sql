-- Enum values on_trial/cancelled/expired are added in 20260410170000_billing_webhook_schema_guard.sql
-- (cannot ADD VALUE and use new enum labels in the same migration transaction).

alter table public.subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists provider_customer_id text,
  add column if not exists provider_order_id text,
  add column if not exists provider_product_id text,
  add column if not exists provider_variant_id text,
  add column if not exists provider_product_name text,
  add column if not exists provider_variant_name text,
  add column if not exists plan_code text,
  add column if not exists renews_at timestamp with time zone,
  add column if not exists test_mode boolean not null default false,
  add column if not exists raw_payload jsonb;

alter table public.profiles
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists subscription_debug_plan text,
  add column if not exists subscription_debug_status text,
  add column if not exists subscription_debug_now timestamp with time zone,
  add column if not exists subscription_debug_trial_ends_at timestamp with time zone,
  add column if not exists subscription_debug_renews_at timestamp with time zone;

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'trial', 'monthly_pro', 'quarterly_pro', 'yearly_pro'));

alter table public.profiles
  drop constraint if exists profiles_subscription_debug_plan_check;

alter table public.profiles
  add constraint profiles_subscription_debug_plan_check
  check (
    subscription_debug_plan is null
    or subscription_debug_plan in ('free', 'trial', 'monthly_pro', 'quarterly_pro', 'yearly_pro')
  );

update public.subscriptions s
set
  renews_at = coalesce(s.renews_at, s.current_period_end),
  plan_code = coalesce(
    s.plan_code,
    case
      when s.status = 'trialing' then 'trial'
      when p.interval = 'year' then 'yearly_pro'
      when p.interval = 'month' and coalesce(p.interval_count, 1) = 3 then 'quarterly_pro'
      when p.interval = 'month' then 'monthly_pro'
      else null
    end
  )
from public.prices p
where p.id = s.price_id;

update public.profiles p
set subscription_plan = case
  when exists (
    select 1
    from public.subscriptions s
    left join public.prices pr on pr.id = s.price_id
    where s.user_id = p.id
      and (
        s.status = 'trialing'
        or s.status = 'active'
        or (s.status = 'canceled' and s.ended_at is not null and s.ended_at > now())
      )
    order by s.created desc
    limit 1
  ) then coalesce(
    (
      select case
        when s.status = 'trialing' then 'trial'
        when pr.interval = 'year' then 'yearly_pro'
        when pr.interval = 'month' and coalesce(pr.interval_count, 1) = 3 then 'quarterly_pro'
        when pr.interval = 'month' then 'monthly_pro'
        else null
      end
      from public.subscriptions s
      left join public.prices pr on pr.id = s.price_id
      where s.user_id = p.id
      order by s.created desc
      limit 1
    ),
    case when p.is_subscribed then 'monthly_pro' else 'free' end
  )
  else case when p.is_subscribed then 'monthly_pro' else 'free' end
end;
