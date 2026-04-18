-- Full onboarding draft snapshot before Google OAuth (survives redirect; client localStorage alone is unreliable).
-- Consumed in app/auth/callback after exchangeCodeForSession. API + service role only.

create table public.onboarding_oauth_pending (
  token text primary key,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index onboarding_oauth_pending_expires_idx on public.onboarding_oauth_pending (expires_at);

alter table public.onboarding_oauth_pending enable row level security;

comment on table public.onboarding_oauth_pending is
  'Short-lived onboarding draft for OAuth signup; written by POST /api/onboarding/pending-oauth-draft, read once in /auth/callback.';
