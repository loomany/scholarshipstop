-- =============================================================================
-- Каталог scholarships / grants для Supabase
-- Дедупликация: source+url | source+source_id | source+text_fingerprint
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Таблица
-- -----------------------------------------------------------------------------
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),

  source text not null,
  source_id text,
  url text not null,

  title text not null,
  provider_name text,
  provider_url text,
  provider_mission text,

  award_amount_text text,
  award_amount_min numeric,
  award_amount_max numeric,
  currency text not null default 'USD',

  deadline_text text,
  deadline_date date,

  requirements_count integer,
  requirements_text text,

  applicants_count integer,

  credibility_score_text text,
  is_verified boolean not null default false,
  is_recurring boolean not null default false,

  winner_payment_text text,
  description text,

  provider_social_facebook text,
  provider_social_instagram text,
  provider_social_linkedin text,

  apply_url text,
  apply_button_text text,
  application_status_text text,

  mark_started_available boolean not null default false,
  mark_submitted_available boolean not null default false,

  category text,
  tags jsonb not null default '[]'::jsonb,

  is_active boolean not null default true,

  text_fingerprint text,

  raw_data jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.scholarships is 'Каталог стипендий; дедуп по source+url / source+source_id / source+text_fingerprint';

-- -----------------------------------------------------------------------------
-- Уровень 1: один и тот же источник не может дважды сохранить одну и ту же ссылку
-- -----------------------------------------------------------------------------
create unique index if not exists scholarships_unique_source_url
  on public.scholarships (source, url);

-- -----------------------------------------------------------------------------
-- Уровень 2: если у записи есть source_id — пара (source, source_id) уникальна
-- -----------------------------------------------------------------------------
create unique index if not exists scholarships_unique_source_source_id_nonempty
  on public.scholarships (source, source_id)
  where source_id is not null
    and btrim(source_id) <> '';

-- -----------------------------------------------------------------------------
-- Уровень 3: если есть text_fingerprint — пара (source, fingerprint) уникальна
-- -----------------------------------------------------------------------------
create unique index if not exists scholarships_unique_source_fingerprint_nonempty
  on public.scholarships (source, text_fingerprint)
  where text_fingerprint is not null
    and btrim(text_fingerprint) <> '';

-- -----------------------------------------------------------------------------
-- Дополнительные индексы под выборки и парсер
-- -----------------------------------------------------------------------------
create index if not exists scholarships_idx_source
  on public.scholarships (source);

create index if not exists scholarships_idx_active_deadline
  on public.scholarships (is_active, deadline_date)
  where is_active = true;

create index if not exists scholarships_idx_last_seen
  on public.scholarships (last_seen_at desc);

create index if not exists scholarships_idx_tags_gin
  on public.scholarships using gin (tags);

-- -----------------------------------------------------------------------------
-- updated_at: функция + триггер
-- -----------------------------------------------------------------------------
create or replace function public.scholarships_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists scholarships_set_updated_at on public.scholarships;

create trigger scholarships_set_updated_at
  before update on public.scholarships
  for each row
  execute function public.scholarships_set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: чтение каталога с клиента; запись — через service role / backend
-- -----------------------------------------------------------------------------
alter table public.scholarships enable row level security;

drop policy if exists "scholarships_select_public" on public.scholarships;

create policy "scholarships_select_public"
  on public.scholarships
  for select
  to anon, authenticated
  using (true);

-- service_role обходит RLS — парсер/сервер с секретным ключом смогут INSERT/UPDATE
