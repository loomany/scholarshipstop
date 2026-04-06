-- =============================================================================
-- scholarships: полная сверка схемы с парсером / types_db (идемпотентно).
-- Назначение:
--   • Если более ранние миграции применились частично или вручную добавлялись
--     только отдельные колонки — этот файл добавит ВСЕ недостающие колонки.
--   • Безопасно запускать повторно (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).
-- Требуется: таблица public.scholarships уже существует (миграция каталога).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Расширенные текстовые поля (детальная страница)
-- -----------------------------------------------------------------------------
alter table public.scholarships add column if not exists status_text text;
alter table public.scholarships add column if not exists institutions_text text;
alter table public.scholarships add column if not exists state_territory_text text;
alter table public.scholarships add column if not exists support_email text;
alter table public.scholarships add column if not exists support_phone text;
alter table public.scholarships add column if not exists eligibility_text text;
alter table public.scholarships add column if not exists awards_text text;
alter table public.scholarships add column if not exists notification_text text;
alter table public.scholarships add column if not exists selection_criteria_text text;

-- -----------------------------------------------------------------------------
-- HTML-фрагменты секций
-- -----------------------------------------------------------------------------
alter table public.scholarships add column if not exists description_html text;
alter table public.scholarships add column if not exists eligibility_html text;
alter table public.scholarships add column if not exists awards_html text;
alter table public.scholarships add column if not exists notification_html text;
alter table public.scholarships add column if not exists payment_html text;
alter table public.scholarships add column if not exists requirements_html text;
alter table public.scholarships add column if not exists selection_criteria_html text;

-- -----------------------------------------------------------------------------
-- Полный снимок основного HTML (архив)
-- -----------------------------------------------------------------------------
alter table public.scholarships add column if not exists full_content_html text;

-- -----------------------------------------------------------------------------
-- Нормализация, фильтры, сортировка, SEO
-- -----------------------------------------------------------------------------
alter table public.scholarships add column if not exists slug text;
alter table public.scholarships add column if not exists provider_slug text;
alter table public.scholarships add column if not exists scholarship_status text;
alter table public.scholarships add column if not exists days_until_deadline integer;
alter table public.scholarships add column if not exists deadline_bucket text;
alter table public.scholarships add column if not exists award_amount_numeric_sort numeric;
alter table public.scholarships add column if not exists payout_method text;
alter table public.scholarships add column if not exists credibility_score integer;
alter table public.scholarships add column if not exists credibility_bucket text;
alter table public.scholarships add column if not exists ranking_score double precision;

alter table public.scholarships add column if not exists requirement_types jsonb not null default '[]'::jsonb;
alter table public.scholarships add column if not exists requirement_signals_count integer;

alter table public.scholarships add column if not exists essay_required boolean not null default false;
alter table public.scholarships add column if not exists document_required boolean not null default false;
alter table public.scholarships add column if not exists photo_required boolean not null default false;
alter table public.scholarships add column if not exists video_required boolean not null default false;
alter table public.scholarships add column if not exists link_required boolean not null default false;
alter table public.scholarships add column if not exists survey_required boolean not null default false;
alter table public.scholarships add column if not exists question_required boolean not null default false;
alter table public.scholarships add column if not exists goal_required boolean not null default false;
alter table public.scholarships add column if not exists special_eligibility_required boolean not null default false;
alter table public.scholarships add column if not exists transcript_required boolean not null default false;
alter table public.scholarships add column if not exists recommendation_required boolean not null default false;
alter table public.scholarships add column if not exists financial_need_considered boolean not null default false;

alter table public.scholarships add column if not exists study_levels jsonb not null default '[]'::jsonb;
alter table public.scholarships add column if not exists field_of_study jsonb not null default '[]'::jsonb;
alter table public.scholarships add column if not exists citizenship_statuses jsonb not null default '[]'::jsonb;
alter table public.scholarships add column if not exists location_scope text;
alter table public.scholarships add column if not exists state_codes jsonb not null default '[]'::jsonb;
alter table public.scholarships add column if not exists institution_types jsonb not null default '[]'::jsonb;

alter table public.scholarships add column if not exists number_of_awards integer;

alter table public.scholarships add column if not exists summary_short text;
alter table public.scholarships add column if not exists summary_long text;
alter table public.scholarships add column if not exists who_can_apply text;
alter table public.scholarships add column if not exists notification_details text;
alter table public.scholarships add column if not exists payment_details text;
alter table public.scholarships add column if not exists documents_required jsonb;
alter table public.scholarships add column if not exists requirements_text_clean text;
alter table public.scholarships add column if not exists official_source_name text;
alter table public.scholarships add column if not exists last_verified_at timestamptz;
alter table public.scholarships add column if not exists is_indexable boolean not null default true;

-- -----------------------------------------------------------------------------
-- Индексы (листинг / фильтры / slug)
-- -----------------------------------------------------------------------------
create unique index if not exists scholarships_slug_unique
  on public.scholarships (slug)
  where slug is not null and btrim(slug) <> '';

create index if not exists scholarships_idx_active_ranking
  on public.scholarships (is_active, ranking_score desc nulls last)
  where is_active = true;

create index if not exists scholarships_idx_active_amount_sort
  on public.scholarships (is_active, award_amount_numeric_sort desc nulls last)
  where is_active = true;

create index if not exists scholarships_idx_active_deadline_bucket
  on public.scholarships (is_active, deadline_bucket)
  where is_active = true;

create index if not exists scholarships_idx_active_payout
  on public.scholarships (is_active, payout_method)
  where is_active = true;

create index if not exists scholarships_requirement_types_gin
  on public.scholarships using gin (requirement_types);

-- -----------------------------------------------------------------------------
-- Комментарии (документация в БД)
-- -----------------------------------------------------------------------------
comment on column public.scholarships.slug is 'URL slug; unique when set';
comment on column public.scholarships.ranking_score is 'Internal default sort score (not marketing magic)';
comment on column public.scholarships.credibility_score is 'Heuristic 0-100; nullable when unknown';
comment on column public.scholarships.credibility_bucket is 'UI filter bucket; use unknown when no honest score';
comment on column public.scholarships.full_content_html is 'Full .scholarship-content inner HTML (script/style/svg stripped); fallback archive of page body';
comment on column public.scholarships.description_html is 'Sanitized-ready HTML: intro / main description';
comment on column public.scholarships.eligibility_html is 'Full Eligibility section HTML fragment';
comment on column public.scholarships.awards_html is 'Full Awards section HTML fragment';
comment on column public.scholarships.notification_html is 'Full Notification section HTML fragment';
comment on column public.scholarships.payment_html is 'Payment of Scholarships section HTML fragment';
comment on column public.scholarships.requirements_html is 'Requirements block HTML fragment';
comment on column public.scholarships.selection_criteria_html is 'Selection of Recipients section HTML fragment';
comment on column public.scholarships.status_text is 'e.g. Open / Closed from source site';
comment on column public.scholarships.institutions_text is 'Eligible institution types (free text)';
comment on column public.scholarships.state_territory_text is 'Geographic eligibility (free text)';
comment on column public.scholarships.support_email is 'Program support email';
comment on column public.scholarships.support_phone is 'Program support phone';
comment on column public.scholarships.eligibility_text is 'Full Eligibility section body';
comment on column public.scholarships.awards_text is 'Full Awards section body';
comment on column public.scholarships.notification_text is 'Full Notification section body';
comment on column public.scholarships.selection_criteria_text is 'Full Selection of Recipients section body';
