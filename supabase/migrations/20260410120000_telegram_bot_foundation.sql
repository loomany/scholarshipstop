create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null unique,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  app_user_id uuid unique references auth.users(id) on delete set null,
  is_admin boolean not null default false,
  notifications_enabled boolean not null default false,
  last_state text not null default 'idle',
  pending_email text,
  last_bot_started_at timestamptz,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_users_last_state_check check (
    last_state in ('idle', 'awaiting_email', 'awaiting_code')
  )
);

create index if not exists telegram_users_app_user_id_idx
  on public.telegram_users(app_user_id);

create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  telegram_user_uuid uuid not null references public.telegram_users(id) on delete cascade,
  app_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_link_codes_lookup_idx
  on public.telegram_link_codes(telegram_user_uuid, created_at desc);

create index if not exists telegram_link_codes_app_user_id_idx
  on public.telegram_link_codes(app_user_id);

create table if not exists public.telegram_event_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  related_user_id uuid references auth.users(id) on delete set null,
  telegram_chat_id bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint telegram_event_logs_event_type_check check (
    event_type in ('signup', 'email_verified', 'payment', 'bot_start')
  )
);

create index if not exists telegram_event_logs_event_type_created_at_idx
  on public.telegram_event_logs(event_type, created_at desc);

create index if not exists telegram_event_logs_related_user_id_idx
  on public.telegram_event_logs(related_user_id);

alter table public.telegram_users enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.telegram_event_logs enable row level security;

drop policy if exists "Service role manages telegram_users" on public.telegram_users;
create policy "Service role manages telegram_users"
  on public.telegram_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages telegram_link_codes" on public.telegram_link_codes;
create policy "Service role manages telegram_link_codes"
  on public.telegram_link_codes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages telegram_event_logs" on public.telegram_event_logs;
create policy "Service role manages telegram_event_logs"
  on public.telegram_event_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
