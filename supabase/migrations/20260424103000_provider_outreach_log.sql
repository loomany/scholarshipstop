-- Idempotent log for provider outreach sends (per email + campaign).

create table if not exists public.provider_outreach_log (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  sent_at timestamptz not null default now(),
  campaign_key text not null default 'provider-partnership-spring-2026'
);

create index if not exists provider_outreach_log_email_idx
  on public.provider_outreach_log (email);

create unique index if not exists provider_outreach_log_email_campaign_uidx
  on public.provider_outreach_log (email, campaign_key);

alter table public.provider_outreach_log enable row level security;

revoke all on public.provider_outreach_log from anon;
revoke all on public.provider_outreach_log from authenticated;
