-- Prevent clients from self-escalating billing/access flags through broad profile update RLS.
create or replace function public.prevent_profile_billing_self_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and auth.uid() = old.id then
    if new.is_subscribed is distinct from old.is_subscribed
      or new.subscription_plan is distinct from old.subscription_plan
      or new.subscription_debug_plan is distinct from old.subscription_debug_plan
      or new.subscription_debug_status is distinct from old.subscription_debug_status
      or new.subscription_debug_trial_ends_at is distinct from old.subscription_debug_trial_ends_at
      or new.subscription_debug_renews_at is distinct from old.subscription_debug_renews_at
      or new.subscription_debug_now is distinct from old.subscription_debug_now then
      raise exception 'Billing fields are managed by the server only.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_billing_self_updates on public.profiles;
create trigger profiles_prevent_billing_self_updates
  before update on public.profiles
  for each row
  execute function public.prevent_profile_billing_self_updates();
