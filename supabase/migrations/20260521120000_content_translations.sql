-- ES/FR DB-backed SEO translations (foundation). English source rows stay in existing tables.

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  locale text not null,
  source_hash text,
  source_updated_at timestamptz,
  status text not null default 'missing',
  translated_slug text,
  translated_title text,
  translated_meta_title text,
  translated_meta_description text,
  translated_summary text,
  translated_body text,
  translated_faq_json jsonb,
  translated_schema_json jsonb,
  translated_extra_json jsonb,
  quality_score integer,
  machine_model text,
  translated_by text,
  reviewed_by text,
  reviewer_notes text,
  published_at timestamptz,
  stale_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_translations_locale_check
    check (locale in ('es', 'fr')),
  constraint content_translations_status_check
    check (
      status in (
        'missing',
        'queued',
        'draft_machine',
        'draft_agent',
        'review_required',
        'reviewed',
        'published',
        'stale',
        'blocked'
      )
    ),
  constraint content_translations_source_type_check
    check (
      source_type in (
        'scholarship_detail',
        'provider_profile',
        'resource_article',
        'essay_guide',
        'compare_state',
        'compare_university',
        'scholarship_category',
        'seo_hub',
        'seo_manifest',
        'seo_country',
        'university_hub'
      )
    ),
  constraint content_translations_unique_source_locale
    unique (source_type, source_id, locale),
  constraint content_translations_quality_score_range
    check (quality_score is null or (quality_score >= 0 and quality_score <= 100))
);

comment on table public.content_translations is
  'Localized ES/FR copy for DB-backed SEO pages. English canonical content remains in source tables.';

create index if not exists content_translations_source_locale_idx
  on public.content_translations (source_type, source_id, locale);

create index if not exists content_translations_locale_status_idx
  on public.content_translations (locale, status);

create index if not exists content_translations_source_type_locale_status_idx
  on public.content_translations (source_type, locale, status);

create index if not exists content_translations_status_updated_at_idx
  on public.content_translations (status, updated_at desc);

create index if not exists content_translations_published_lookup_idx
  on public.content_translations (source_type, source_id, locale)
  where status = 'published';

alter table public.content_translations enable row level security;

-- Public reads: published rows only (draft/review/stale/blocked are invisible to anon/authenticated).
create policy "content_translations_select_published_public"
  on public.content_translations
  for select
  to anon, authenticated
  using (status = 'published');

-- Inserts/updates/deletes: service role only (no policy for anon/authenticated writes).

create or replace function public.set_content_translations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_translations_set_updated_at on public.content_translations;
create trigger content_translations_set_updated_at
  before insert or update on public.content_translations
  for each row
  execute function public.set_content_translations_updated_at();
