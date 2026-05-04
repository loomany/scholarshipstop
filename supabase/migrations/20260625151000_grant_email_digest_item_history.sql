-- History of scholarship cards shown inside daily grant digest emails.
-- Used to rotate fallback recommendations and avoid showing the same grants every day.

create table if not exists public.grant_email_digest_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  section text not null check (section in ('best', 'saved_filters', 'easy_apply', 'hot_deadlines', 'recommended')),
  digest_kind text not null check (digest_kind in ('direct', 'fallback')),
  created_at timestamptz not null default now()
);

create index if not exists grant_email_digest_items_user_created_idx
  on public.grant_email_digest_items (user_id, created_at desc);

create index if not exists grant_email_digest_items_user_scholarship_idx
  on public.grant_email_digest_items (user_id, scholarship_id, created_at desc);

alter table public.grant_email_digest_items enable row level security;

revoke all on public.grant_email_digest_items from anon;
revoke all on public.grant_email_digest_items from authenticated;
