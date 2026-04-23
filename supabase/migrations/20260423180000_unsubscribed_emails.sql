-- Global marketing email opt-out (do not reuse profiles.is_subscribed — that is billing).

create table if not exists public.unsubscribed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

-- Application stores `normalizeMarketingEmail` output (trim + lower).
create unique index if not exists unsubscribed_emails_email_key
  on public.unsubscribed_emails (email);

alter table public.unsubscribed_emails enable row level security;

revoke all on public.unsubscribed_emails from anon;
revoke all on public.unsubscribed_emails from authenticated;
