-- Normalized catalog fields: filters, sort, SEO, categories (tags JSONB + these columns).

-- Slug for public URLs (/scholarships/[slug]); UUID links still work via resolver.
alter table public.scholarships add column if not exists slug text;
create unique index if not exists scholarships_slug_unique
  on public.scholarships (slug)
  where slug is not null and btrim(slug) <> '';

alter table public.scholarships add column if not exists provider_slug text;

-- open | closed | upcoming | unknown
alter table public.scholarships add column if not exists scholarship_status text;

alter table public.scholarships add column if not exists days_until_deadline integer;
-- lt_1d | d1_7 | d8_28 | gt_28 | unknown
alter table public.scholarships add column if not exists deadline_bucket text;

alter table public.scholarships add column if not exists award_amount_numeric_sort numeric;

alter table public.scholarships add column if not exists payout_method text;
-- college | student | non_monetary | not_stated

alter table public.scholarships add column if not exists credibility_score integer;
alter table public.scholarships add column if not exists credibility_bucket text;
-- low | medium | high | verified | unknown

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

comment on column public.scholarships.slug is 'URL slug; unique when set';
comment on column public.scholarships.ranking_score is 'Internal default sort score (not marketing magic)';
comment on column public.scholarships.credibility_score is 'Heuristic 0-100; nullable when unknown';
comment on column public.scholarships.credibility_bucket is 'UI filter bucket; use unknown when no honest score';
