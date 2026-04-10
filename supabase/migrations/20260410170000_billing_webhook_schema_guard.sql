do $$
begin
  alter type public.subscription_status add value if not exists 'on_trial';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.subscription_status add value if not exists 'cancelled';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.subscription_status add value if not exists 'expired';
exception
  when duplicate_object then null;
end $$;

alter table if exists public.subscriptions
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

alter table if exists public.profiles
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists subscription_debug_plan text,
  add column if not exists subscription_debug_status text,
  add column if not exists subscription_debug_now timestamp with time zone,
  add column if not exists subscription_debug_trial_ends_at timestamp with time zone,
  add column if not exists subscription_debug_renews_at timestamp with time zone;

alter table if exists public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table if exists public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'trial', 'monthly_pro', 'quarterly_pro', 'yearly_pro'));

alter table if exists public.profiles
  drop constraint if exists profiles_subscription_debug_plan_check;

alter table if exists public.profiles
  add constraint profiles_subscription_debug_plan_check
  check (
    subscription_debug_plan is null
    or subscription_debug_plan in ('free', 'trial', 'monthly_pro', 'quarterly_pro', 'yearly_pro')
  );
