-- App-level "please verify email" when Supabase "Confirm email" is OFF (instant login).
-- false = show Not confirmed in /account until user opens /auth/verify-email?token=...
alter table public.profiles
  add column if not exists email_verified boolean not null default true;

update public.profiles set email_verified = true where email_verified is null;
